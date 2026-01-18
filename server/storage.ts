import { db } from "./db";
import {
  users, files, chatRooms, chatMessages, dlpLogs,
  type User, type InsertUser,
  type FileRecord, type InsertFile, type UpdateFileRequest,
  type ChatRoom, type InsertChatRoom,
  type ChatMessage, type InsertChatMessage,
  type DlpLog, type InsertDlpLog,
  type StorageStatsResponse
} from "@shared/schema";
import { eq, desc, sql, and, like } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Auth & User
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Files
  getFile(id: number): Promise<FileRecord | undefined>;
  getFiles(userId: number, view?: 'all' | 'recent' | 'starred' | 'trash', search?: string): Promise<FileRecord[]>;
  createFile(file: InsertFile): Promise<FileRecord>;
  updateFile(id: number, userId: number, updates: UpdateFileRequest): Promise<FileRecord | undefined>;
  deleteFile(id: number, userId: number): Promise<FileRecord | undefined>; // Soft delete or hard delete depending on implementation
  getStorageStats(userId: number): Promise<StorageStatsResponse>;

  // Chat
  getChatRooms(): Promise<ChatRoom[]>;
  getChatRoom(id: number): Promise<ChatRoom | undefined>;
  createChatRoom(room: InsertChatRoom): Promise<ChatRoom>;
  getChatMessages(roomId: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // DLP Logs
  createDlpLog(log: InsertDlpLog): Promise<DlpLog>;
  getDlpLogs(): Promise<DlpLog[]>;

  // Session Store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  // === User ===
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // === Files ===
  async getFile(id: number): Promise<FileRecord | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }

  async getFiles(userId: number, view: 'all' | 'recent' | 'starred' | 'trash' = 'all', search?: string): Promise<FileRecord[]> {
    let query = db.select().from(files).where(eq(files.userId, userId));

    // Base filters
    if (view === 'trash') {
      query.where(and(eq(files.userId, userId), eq(files.isTrash, true)));
    } else {
      let conditions = [eq(files.userId, userId), eq(files.isTrash, false)];
      
      if (view === 'starred') {
        conditions.push(eq(files.isStarred, true));
      }
      // 'recent' implies sorting, which is handled below, but strictly speaking it's "not trash"
      
      query.where(and(...conditions));
    }

    // Search filter
    if (search) {
      // Note: This is a simple case-sensitive search. For better search, use ilike if supported or lowercase comparison
      query.where(and(eq(files.userId, userId), like(files.fileName, `%${search}%`)));
    }

    // Sorting
    if (view === 'recent') {
      query.orderBy(desc(files.lastAccessed));
    } else {
      query.orderBy(desc(files.uploadDate));
    }

    return await query;
  }

  async createFile(file: InsertFile): Promise<FileRecord> {
    const [newFile] = await db.insert(files).values(file).returning();
    return newFile;
  }

  async updateFile(id: number, userId: number, updates: UpdateFileRequest): Promise<FileRecord | undefined> {
    const [updatedFile] = await db
      .update(files)
      .set(updates)
      .where(and(eq(files.id, id), eq(files.userId, userId)))
      .returning();
    return updatedFile;
  }

  async deleteFile(id: number, userId: number): Promise<FileRecord | undefined> {
    // Soft delete implementation: toggle isTrash
    // Check current status first to toggle or hard delete?
    // For simplicity, let's assume this moves to trash if not there, or deletes if in trash.
    // BUT the prompt implies a simpler "Trash" folder organization.
    // Let's implement hard delete for now if requested via API, or update via updateFile for soft delete.
    // Actually, `updateFile` handles moving to trash. `deleteFile` will be permanent removal.
    const [deletedFile] = await db
      .delete(files)
      .where(and(eq(files.id, id), eq(files.userId, userId)))
      .returning();
    return deletedFile;
  }

  async getStorageStats(userId: number): Promise<StorageStatsResponse> {
    const [stats] = await db
      .select({
        totalUsed: sql<number>`coalesce(sum(${files.fileSize}), 0)`,
        fileCount: sql<number>`count(${files.id})`
      })
      .from(files)
      .where(and(eq(files.userId, userId), eq(files.isTrash, false)));
    
    return {
      totalUsed: Number(stats.totalUsed),
      fileCount: Number(stats.fileCount)
    };
  }

  // === Chat ===
  async getChatRooms(): Promise<ChatRoom[]> {
    return await db.select().from(chatRooms).orderBy(desc(chatRooms.createdAt));
  }

  async getChatRoom(id: number): Promise<ChatRoom | undefined> {
    const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, id));
    return room;
  }

  async createChatRoom(room: InsertChatRoom): Promise<ChatRoom> {
    const [newRoom] = await db.insert(chatRooms).values(room).returning();
    return newRoom;
  }

  async getChatMessages(roomId: number): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.roomId, roomId))
      .orderBy(chatMessages.timestamp);
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db.insert(chatMessages).values(message).returning();
    return newMessage;
  }

  // === DLP Logs ===
  async createDlpLog(log: InsertDlpLog): Promise<DlpLog> {
    const [newLog] = await db.insert(dlpLogs).values(log).returning();
    return newLog;
  }

  async getDlpLogs(): Promise<DlpLog[]> {
    // Return last 100 logs as per requirements
    return await db.select().from(dlpLogs).orderBy(desc(dlpLogs.timestamp)).limit(100);
  }
}

export const storage = new DatabaseStorage();
