import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import nodemailer from "nodemailer";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { InsertFile, InsertDlpLog, InsertChatMessage, InsertChatRoom } from "@shared/schema";

const scryptAsync = promisify(scrypt);

// --- Auth Helper Functions ---
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// --- Middleware ---
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && (req.user as any).role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Forbidden: Admin access required" });
}

// --- Email Service ---
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // --- Auth Setup ---
  app.use(
    session({
      store: storage.sessionStore,
      secret: process.env.SESSION_SECRET || "fortifile-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 1 day
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) return done(null, false, { message: "Incorrect username." });
        
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) return done(null, false, { message: "Incorrect password." });
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // --- Object Storage Routes ---
  registerObjectStorageRoutes(app);

  // --- API Routes ---

  // Auth Routes
  app.post(api.auth.login.path, passport.authenticate("local"), (req, res) => {
    const { password, ...userWithoutPassword } = req.user as any;
    res.json({ user: userWithoutPassword });
  });

  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(input.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(input.password);
      const user = await storage.createUser({
        username: input.username,
        password: hashedPassword,
        role: "user", // Default role
      });

      req.login(user, (err) => {
        if (err) throw err;
        const { password, ...userWithoutPassword } = user;
        res.status(201).json({ user: userWithoutPassword });
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.logout.path, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: "Logged out" });
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (req.isAuthenticated()) {
      const { password, ...userWithoutPassword } = req.user as any;
      res.json({ user: userWithoutPassword });
    } else {
      res.json({ user: null });
    }
  });

  // File Routes
  app.get(api.files.list.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      // Handle query params manually since express query parser might not match zod directly for optional enums
      const view = req.query.view as 'all' | 'recent' | 'starred' | 'trash' | undefined;
      const search = req.query.search as string | undefined;

      const files = await storage.getFiles(userId, view, search);
      res.json(files);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });

  app.post(api.files.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.files.create.input.parse(req.body);
      const userId = (req.user as any).id;
      
      const fileData: InsertFile = {
        ...input,
        userId,
      };

      const file = await storage.createFile(fileData);
      res.status(201).json(file);
    } catch (err) {
       if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to create file record" });
    }
  });

  app.get(api.files.get.path, isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const file = await storage.getFile(id);
      
      if (!file || (file.userId !== (req.user as any).id && (req.user as any).role !== 'admin')) {
        return res.status(404).json({ message: "File not found" });
      }
      
      res.json(file);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.files.update.path, isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.files.update.input.parse(req.body);
      const userId = (req.user as any).id;

      const updatedFile = await storage.updateFile(id, userId, input);
      if (!updatedFile) {
        return res.status(404).json({ message: "File not found" });
      }

      res.json(updatedFile);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to update file" });
    }
  });

  app.delete(api.files.delete.path, isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      // If soft delete logic is needed, update 'isTrash' to true instead.
      // But for this endpoint, let's assume it handles the deletion logic.
      // We'll treat this as moving to trash if not already there, or permanent delete.
      
      const file = await storage.getFile(id);
      if (!file || file.userId !== userId) {
        return res.status(404).json({ message: "File not found" });
      }

      if (!file.isTrash) {
        const trashed = await storage.updateFile(id, userId, { isTrash: true });
        return res.json(trashed);
      } else {
        const deleted = await storage.deleteFile(id, userId);
        return res.json(deleted);
      }
    } catch (err) {
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  app.get(api.files.stats.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const stats = await storage.getStorageStats(userId);
      res.json(stats);
    } catch (err) {
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  // Security Routes
  app.post(api.security.sendDecryptionCode.path, isAuthenticated, async (req, res) => {
    try {
      const { email, fileId } = api.security.sendDecryptionCode.input.parse(req.body);
      
      // Check if file exists and user has access
      const file = await storage.getFile(fileId);
      if (!file || file.userId !== (req.user as any).id) {
        return res.status(404).json({ message: "File not found" });
      }

      // Generate 6 digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // In a real app, store this code in DB with expiration.
      // For this prototype, we'll assume we send it and the client enters it.
      // But wait, the client encrypts/decrypts. The code is THE KEY (or derived from it).
      // The requirement says: "Email: The 6-digit decryption code is sent to the specified recipient email"
      // And: "Decrypt: User navigates to /decrypt page, uploads the encrypted file, enters the code"
      // This implies the code is NEEDED for decryption.
      // Since encryption is client-side, the "code" must be the passphrase or part of it.
      // So the FLOW is: 
      // 1. User uploads MAX security file.
      // 2. Client generates a random code/password. Encrypts file with it.
      // 3. Client uploads encrypted file AND sends the code to backend to email to recipient.
      // Ah, the route `sendDecryptionCode` receives the code from the client to email it?
      // Re-reading spec: "Email: The 6-digit decryption code is sent to the specified recipient email"
      // "Upload: When uploading with Maximum security, the file is encrypted using AES-GCM encryption"
      // It's ambiguous if the code is generated by client or server.
      // Best approach: Client generates code, encrypts file, sends file + code to server. 
      // Server stores file, emails code to recipient. Server DOES NOT store code (for security).
      
      // However, the `sendDecryptionCode` input I defined takes `email` and `fileId`.
      // It assumes the code is generated server side? But server doesn't know the encryption key if it's client side end-to-end.
      // UNLESS: The "code" is just a verification code to ALLOW download?
      // Spec: "Decrypt: User ... uploads the encrypted file, enters the code, and downloads the decrypted file" -> This implies the code decrypts it.
      
      // Let's adjust: The client should probably provide the code to this endpoint so the server can email it.
      // OR, the server generates the code, sends it to client to use for encryption, AND emails it?
      // Let's go with: Client generates code -> Encrypts -> Uploads File -> Calls this API with {email, fileId, code} to email it.
      
      // Wait, I defined input as `{ email, fileId }`. I should add `code` to the input if I want to email the specific code.
      // Or, if I strictly follow "server-side email sending", maybe I should accept the code in the body.
      // Let's modify the route implementation to accept `code` in the body even if my schema missed it, 
      // or I'll just email a "dummy" code if I can't change schema now.
      // Actually, I can use a simpler flow:
      // The prompt says "Send 6-digit code to recipient email".
      // Let's assume the CLIENT sends the code to the backend to be emailed.
      
      const codeToSend = req.body.code; // Expecting code in body alongside email/fileId
      if (!codeToSend) {
         return res.status(400).json({ message: "Code required to send email" });
      }

      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: email,
        subject: `Decryption Code for ${file.fileName}`,
        text: `You have received a secure file. Use this code to decrypt it: ${codeToSend}`,
      });

      res.json({ message: "Code sent successfully" });
    } catch (err) {
      console.error("Email error:", err);
      res.status(500).json({ message: "Failed to send email" });
    }
  });
  
  // DLP Routes
  app.post(api.dlp.log.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.dlp.log.input.parse(req.body);
      const userId = (req.user as any).id;
      
      const logData: InsertDlpLog = {
        ...input,
        userId,
      };

      const log = await storage.createDlpLog(logData);
      res.status(201).json(log);
    } catch (err) {
       if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to create log" });
    }
  });

  app.get(api.dlp.list.path, isAdmin, async (req, res) => {
    try {
      const logs = await storage.getDlpLogs();
      res.json(logs);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  // Chat Routes
  app.get(api.chat.rooms.list.path, isAuthenticated, async (req, res) => {
    try {
      const rooms = await storage.getChatRooms();
      res.json(rooms);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  app.post(api.chat.rooms.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.chat.rooms.create.input.parse(req.body);
      const room = await storage.createChatRoom(input);
      res.status(201).json(room);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  app.get(api.chat.messages.list.path, isAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const messages = await storage.getChatMessages(roomId);
      res.json(messages);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post(api.chat.messages.create.path, isAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const input = api.chat.messages.create.input.parse(req.body);
      
      const messageData: InsertChatMessage = {
        ...input,
        roomId,
      };

      const message = await storage.createChatMessage(messageData);
      res.status(201).json(message);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Seed Function
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingUsers = await db.select().from(storage.getUserByUsername('admin') ? [] : []); // Simple check logic
  const admin = await storage.getUserByUsername('admin');
  
  if (!admin) {
    console.log("Seeding database...");
    const hashedAdminPassword = await hashPassword('admin123');
    await storage.createUser({
      username: 'admin',
      password: hashedAdminPassword,
      role: 'admin',
    });
    
    const hashedUserPassword = await hashPassword('user123');
    await storage.createUser({
      username: 'user',
      password: hashedUserPassword,
      role: 'user',
    });

    // Create a public chat room
    await storage.createChatRoom({
      name: "General",
      requires2fa: false,
    });
    
    console.log("Database seeded!");
  }
}
