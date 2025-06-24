import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Users table
export const users = sqliteTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => nanoid()),
    email: text('email').notNull().unique(),
    username: text('username').notNull().unique(),
    fullName: text('full_name'),
    avatarUrl: text('avatar_url'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    lastLogin: text('last_login'),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  },
  table => ({
    emailIdx: index('idx_users_email').on(table.email),
    usernameIdx: index('idx_users_username').on(table.username),
  })
);

// User settings table
export const userSettings = sqliteTable(
  'user_settings',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    theme: text('theme').default('dark').notNull(),
    defaultMode: text('default_mode').default('assistant').notNull(),
    defaultProvider: text('default_provider').default('openai').notNull(),
    providerConfigs: text('provider_configs').default('{}').notNull(),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  table => ({
    userIdIdx: index('idx_user_settings_user_id').on(table.userId),
  })
);

// Conversations table
export const conversations = sqliteTable(
  'conversations',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    mode: text('mode').notNull(),
    provider: text('provider').notNull(),
    shareId: text('share_id').unique(),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    lastMessageAt: text('last_message_at'),
    isArchived: integer('is_archived', { mode: 'boolean' }).default(false).notNull(),
  },
  table => ({
    userIdIdx: index('idx_conversations_user_id').on(table.userId),
    updatedAtIdx: index('idx_conversations_updated_at').on(table.updatedAt),
    shareIdIdx: index('idx_conversations_share_id').on(table.shareId),
  })
);

// Messages table
export const messages = sqliteTable(
  'messages',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => nanoid()),
    conversationId: text('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),
    role: text('role').notNull(),
    content: text('content').notNull(),
    mode: text('mode').notNull(),
    metadata: text('metadata').default('{}').notNull(),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  table => ({
    conversationIdIdx: index('idx_messages_conversation_id').on(table.conversationId),
    createdAtIdx: index('idx_messages_created_at').on(table.createdAt),
  })
);

// Tickets table
export const tickets = sqliteTable(
  'tickets',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => nanoid()),
    conversationId: text('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),
    messageId: text('message_id').references(() => messages.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    type: text('type').notNull(),
    priority: text('priority').default('medium').notNull(),
    status: text('status').default('pending').notNull(),
    acceptanceCriteria: text('acceptance_criteria').default('[]').notNull(),
    tasks: text('tasks').default('[]').notNull(),
    labels: text('labels').default('[]').notNull(),
    externalId: text('external_id'),
    externalUrl: text('external_url'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  table => ({
    conversationIdIdx: index('idx_tickets_conversation_id').on(table.conversationId),
    statusIdx: index('idx_tickets_status').on(table.status),
  })
);

// Provider configurations table
export const providerConfigs = sqliteTable(
  'provider_configs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    provider: text('provider').notNull(),
    config: text('config').default('{}').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  table => ({
    userIdIdx: index('idx_provider_configs_user_id').on(table.userId),
    userProviderIdx: index('idx_provider_configs_user_provider').on(table.userId, table.provider),
  })
);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  conversations: many(conversations),
  providerConfigs: many(providerConfigs),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
  tickets: many(tickets),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  tickets: many(tickets),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  conversation: one(conversations, {
    fields: [tickets.conversationId],
    references: [conversations.id],
  }),
  message: one(messages, {
    fields: [tickets.messageId],
    references: [messages.id],
  }),
}));

export const providerConfigsRelations = relations(providerConfigs, ({ one }) => ({
  user: one(users, {
    fields: [providerConfigs.userId],
    references: [users.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;

export type ProviderConfig = typeof providerConfigs.$inferSelect;
export type NewProviderConfig = typeof providerConfigs.$inferInsert;
