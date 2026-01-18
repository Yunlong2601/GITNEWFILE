import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(), // Will be hashed
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Files table
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  filePath: text("file_path").notNull(), // Path in object storage
  securityLevel: text("security_level", { enum: ["standard", "high", "maximum"] }).default("standard").notNull(),
  isEncrypted: boolean("is_encrypted").default(false),
  isStarred: boolean("is_starred").default(false),
  isTrash: boolean("is_trash").default(false),
  uploadDate: timestamp("upload_date").defaultNow(),
  lastAccessed: timestamp("last_accessed").defaultNow(),
});

// Chat Rooms table
export const chatRooms = pgTable("chat_rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  requires2fa: boolean("requires_2fa").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat Messages table
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => chatRooms.id).notNull(),
  sender: text("sender").notNull(), // Display name or username
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// DLP Logs table
export const dlpLogs = pgTable("dlp_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  detectedTypes: text("detected_types").array(), // Array of detected sensitive types
  action: text("action", { enum: ["uploaded", "blocked", "cancelled"] }).notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// === RELATIONS ===
export const filesRelations = relations(files, ({ one }) => ({
  user: one(users, {
    fields: [files.userId],
    references: [users.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  room: one(chatRooms, {
    fields: [chatMessages.roomId],
    references: [chatRooms.id],
  }),
}));

export const dlpLogsRelations = relations(dlpLogs, ({ one }) => ({
  user: one(users, {
    fields: [dlpLogs.userId],
    references: [users.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertFileSchema = createInsertSchema(files).omit({ id: true, uploadDate: true, lastAccessed: true });
export const insertChatRoomSchema = createInsertSchema(chatRooms).omit({ id: true, createdAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, timestamp: true });
export const insertDlpLogSchema = createInsertSchema(dlpLogs).omit({ id: true, timestamp: true });

// === EXPLICIT API CONTRACT TYPES ===

// Base types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type FileRecord = typeof files.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;

export type ChatRoom = typeof chatRooms.$inferSelect;
export type InsertChatRoom = z.infer<typeof insertChatRoomSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type DlpLog = typeof dlpLogs.$inferSelect;
export type InsertDlpLog = z.infer<typeof insertDlpLogSchema>;

// Request types
export type CreateFileRequest = InsertFile;
export type UpdateFileRequest = Partial<Omit<InsertFile, "userId" | "filePath">>; // Only update metadata
export type CreateRoomRequest = InsertChatRoom;
export type CreateMessageRequest = InsertChatMessage;
export type LogDlpEventRequest = InsertDlpLog;

export type SendDecryptionCodeRequest = {
  email: string;
  fileId: number;
};

export type VerifyDecryptionCodeRequest = {
  code: string;
  fileId: number;
};

// Response types
export type UserResponse = Omit<User, "password">;
export type FileResponse = FileRecord;
export type ChatRoomResponse = ChatRoom;
export type ChatMessageResponse = ChatMessage;
export type DlpLogResponse = DlpLog;

export type StorageStatsResponse = {
  totalUsed: number;
  fileCount: number;
};

// Auth types
export type LoginRequest = Pick<InsertUser, "username" | "password">;
export type RegisterRequest = Pick<InsertUser, "username" | "password">;
export type AuthResponse = { user: UserResponse };
