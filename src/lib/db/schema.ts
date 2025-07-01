import { nanoid } from 'nanoid';

// Base DynamoDB Item interface
export interface DynamoDBItem {
  PK: string;           // Partition Key
  SK: string;           // Sort Key
  type: string;         // Item type discriminator
  GSI1PK?: string;      // Global Secondary Index 1 Partition Key
  GSI1SK?: string;      // Global Secondary Index 1 Sort Key
  createdAt: string;
  updatedAt: string;
}

// User Profile
export interface User extends DynamoDBItem {
  type: 'USER';
  id: string;
  email: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  lastLogin?: string;
  isActive: boolean;
}

// User Settings
export interface UserSettings extends DynamoDBItem {
  type: 'USER_SETTINGS';
  userId: string;
  theme: string;
  defaultMode: string;
  defaultProvider: string;
  providerConfigs: string; // JSON string
}

// Conversation
export interface Conversation extends DynamoDBItem {
  type: 'CONVERSATION';
  id: string;
  userId: string;
  title: string;
  mode: string;
  provider: string;
  shareId?: string;
  lastMessageAt?: string;
  isArchived: boolean;
}

// Message
export interface Message extends DynamoDBItem {
  type: 'MESSAGE';
  id: string;
  conversationId: string;
  role: string;
  content: string;
  mode: string;
  metadata: string; // JSON string
}

// Ticket
export interface Ticket extends DynamoDBItem {
  type: 'TICKET';
  id: string;
  conversationId: string;
  messageId?: string;
  title: string;
  description: string;
  ticketType: string; // renamed from 'type' to avoid conflict
  priority: string;
  status: string;
  acceptanceCriteria: string; // JSON string
  tasks: string; // JSON string
  labels: string; // JSON string
  externalId?: string;
  externalUrl?: string;
}

// Provider Configuration
export interface ProviderConfig extends DynamoDBItem {
  type: 'PROVIDER_CONFIG';
  id: string;
  userId: string;
  provider: string;
  config: string; // JSON string
  isActive: boolean;
}

// Insert types (for creating new items)
export type NewUser = Omit<User, 'PK' | 'SK' | 'type' | 'id' | 'createdAt' | 'updatedAt'>;
export type NewUserSettings = Omit<UserSettings, 'PK' | 'SK' | 'type' | 'createdAt' | 'updatedAt'>;
export type NewConversation = Omit<Conversation, 'PK' | 'SK' | 'type' | 'id' | 'createdAt' | 'updatedAt'>;
export type NewMessage = Omit<Message, 'PK' | 'SK' | 'type' | 'id' | 'createdAt' | 'updatedAt'>;
export type NewTicket = Omit<Ticket, 'PK' | 'SK' | 'type' | 'id' | 'createdAt' | 'updatedAt'>;
export type NewProviderConfig = Omit<ProviderConfig, 'PK' | 'SK' | 'type' | 'id' | 'createdAt' | 'updatedAt'>;

// Key generation utilities
export const createUserKeys = (userId: string) => ({
  PK: `USER#${userId}`,
  SK: 'PROFILE'
});

export const createUserSettingsKeys = (userId: string) => ({
  PK: `USER#${userId}`,
  SK: 'SETTINGS'
});

export const createConversationKeys = (userId: string, conversationId: string, timestamp?: string) => ({
  PK: `USER#${userId}`,
  SK: `CONV#${timestamp || new Date().toISOString()}#${conversationId}`
});

export const createMessageKeys = (conversationId: string, timestamp: string, messageId: string) => ({
  PK: `CONV#${conversationId}`,
  SK: `MSG#${timestamp}#${messageId}`
});

export const createTicketKeys = (conversationId: string, ticketId: string) => ({
  PK: `CONV#${conversationId}`,
  SK: `TICKET#${ticketId}`
});

export const createProviderConfigKeys = (userId: string, provider: string) => ({
  PK: `USER#${userId}`,
  SK: `PROVIDER#${provider}`
});

// GSI keys for shared conversations
export const createShareKeys = (shareId: string, conversationId: string) => ({
  GSI1PK: `SHARE#${shareId}`,
  GSI1SK: `CONV#${conversationId}`
});

// Utility functions
export const generateId = () => nanoid();

export const createTimestamp = () => new Date().toISOString();

// Helper to create full DynamoDB items
export const createUserItem = (userData: NewUser): User => {
  const id = generateId();
  const now = createTimestamp();
  return {
    ...createUserKeys(id),
    type: 'USER',
    id,
    createdAt: now,
    updatedAt: now,
    ...userData,
  };
};

export const createUserSettingsItem = (settingsData: NewUserSettings): UserSettings => {
  const now = createTimestamp();
  return {
    ...createUserSettingsKeys(settingsData.userId),
    type: 'USER_SETTINGS',
    createdAt: now,
    updatedAt: now,
    ...settingsData,
  };
};

export const createConversationItem = (conversationData: NewConversation): Conversation => {
  const id = generateId();
  const now = createTimestamp();
  const item: Conversation = {
    ...createConversationKeys(conversationData.userId, id, now),
    type: 'CONVERSATION',
    id,
    createdAt: now,
    updatedAt: now,
    ...conversationData,
  };

  // Add GSI keys if shareId is provided
  if (conversationData.shareId) {
    const gsiKeys = createShareKeys(conversationData.shareId, id);
    item.GSI1PK = gsiKeys.GSI1PK;
    item.GSI1SK = gsiKeys.GSI1SK;
  }

  return item;
};

export const createMessageItem = (messageData: NewMessage): Message => {
  const id = generateId();
  const now = createTimestamp();
  return {
    ...createMessageKeys(messageData.conversationId, now, id),
    type: 'MESSAGE',
    id,
    createdAt: now,
    updatedAt: now,
    ...messageData,
  };
};

export const createTicketItem = (ticketData: NewTicket): Ticket => {
  const id = generateId();
  const now = createTimestamp();
  return {
    ...createTicketKeys(ticketData.conversationId, id),
    type: 'TICKET',
    id,
    createdAt: now,
    updatedAt: now,
    ...ticketData,
  };
};

export const createProviderConfigItem = (configData: NewProviderConfig): ProviderConfig => {
  const id = generateId();
  const now = createTimestamp();
  return {
    ...createProviderConfigKeys(configData.userId, configData.provider),
    type: 'PROVIDER_CONFIG',
    id,
    createdAt: now,
    updatedAt: now,
    ...configData,
  };
};
