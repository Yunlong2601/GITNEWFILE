import { z } from 'zod';
import { 
  insertUserSchema, 
  insertFileSchema, 
  insertChatRoomSchema, 
  insertChatMessageSchema, 
  insertDlpLogSchema,
  files, 
  chatRooms, 
  chatMessages, 
  dlpLogs 
} from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  forbidden: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.object({ user: z.any() }), // Typed as UserResponse in implementation
        401: errorSchemas.unauthorized,
      },
    },
    register: {
      method: 'POST' as const,
      path: '/api/auth/register',
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        201: z.object({ user: z.any() }),
        400: errorSchemas.validation,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout',
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me',
      responses: {
        200: z.object({ user: z.any() }).nullable(),
      },
    },
  },
  files: {
    list: {
      method: 'GET' as const,
      path: '/api/files',
      input: z.object({
        view: z.enum(['all', 'recent', 'starred', 'trash']).optional(),
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof files.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/files',
      input: insertFileSchema,
      responses: {
        201: z.custom<typeof files.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/files/:id',
      responses: {
        200: z.custom<typeof files.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/files/:id',
      input: insertFileSchema.partial(),
      responses: {
        200: z.custom<typeof files.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/files/:id', // Soft delete (move to trash) or permanent
      responses: {
        200: z.custom<typeof files.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    stats: {
      method: 'GET' as const,
      path: '/api/stats',
      responses: {
        200: z.object({
          totalUsed: z.number(),
          fileCount: z.number(),
        }),
      },
    },
  },
  security: {
    sendDecryptionCode: {
      method: 'POST' as const,
      path: '/api/security/send-code',
      input: z.object({ email: z.string(), fileId: z.number() }),
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
      },
    },
    verifyDecryptionCode: {
      method: 'POST' as const,
      path: '/api/security/verify-code',
      input: z.object({ code: z.string(), fileId: z.number() }),
      responses: {
        200: z.object({ valid: z.boolean() }),
        400: errorSchemas.validation,
      },
    },
  },
  dlp: {
    log: {
      method: 'POST' as const,
      path: '/api/dlp/logs',
      input: insertDlpLogSchema,
      responses: {
        201: z.custom<typeof dlpLogs.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/dlp/logs', // Admin only
      responses: {
        200: z.array(z.custom<typeof dlpLogs.$inferSelect>()),
        403: errorSchemas.forbidden,
      },
    },
  },
  chat: {
    rooms: {
      list: {
        method: 'GET' as const,
        path: '/api/chat/rooms',
        responses: {
          200: z.array(z.custom<typeof chatRooms.$inferSelect>()),
        },
      },
      create: {
        method: 'POST' as const,
        path: '/api/chat/rooms',
        input: insertChatRoomSchema,
        responses: {
          201: z.custom<typeof chatRooms.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
    },
    messages: {
      list: {
        method: 'GET' as const,
        path: '/api/chat/rooms/:roomId/messages',
        responses: {
          200: z.array(z.custom<typeof chatMessages.$inferSelect>()),
        },
      },
      create: {
        method: 'POST' as const,
        path: '/api/chat/rooms/:roomId/messages',
        input: insertChatMessageSchema.omit({ roomId: true }),
        responses: {
          201: z.custom<typeof chatMessages.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
    },
  },
};

// ============================================
// HELPER: buildUrl
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
