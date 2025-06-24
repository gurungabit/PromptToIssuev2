import { db } from './index';
import { users, userSettings, conversations, messages, providerConfigs } from './schema';

export async function seedDatabase() {
  console.log('🌱 Seeding database...');

  // Create a demo user
  const [demoUser] = await db
    .insert(users)
    .values({
      email: 'demo@example.com',
      username: 'demo_user',
      fullName: 'Demo User',
      isActive: true,
    })
    .returning();

  console.log('✅ Created demo user:', demoUser.id);

  // Create user settings
  await db.insert(userSettings).values({
    userId: demoUser.id,
    theme: 'dark',
    defaultMode: 'assistant',
    defaultProvider: 'ollama',
    providerConfigs: JSON.stringify({
      ollama: {
        model: 'mistral',
        maxTokens: 4000,
        temperature: 0.7,
        baseUrl: 'http://localhost:11434',
      },
      openai: {
        model: 'gpt-3.5-turbo',
        maxTokens: 4000,
        temperature: 0.7,
      },
      anthropic: {
        model: 'claude-3-haiku-20240307',
        maxTokens: 4000,
        temperature: 0.7,
      },
    }),
  });

  console.log('✅ Created user settings');

  // Create provider configs
  await db.insert(providerConfigs).values([
    {
      userId: demoUser.id,
      provider: 'ollama',
      config: JSON.stringify({
        model: 'mistral',
        maxTokens: 4000,
        temperature: 0.7,
        baseUrl: 'http://localhost:11434',
      }),
      isActive: true,
    },
    {
      userId: demoUser.id,
      provider: 'openai',
      config: JSON.stringify({
        model: 'gpt-3.5-turbo',
        maxTokens: 4000,
        temperature: 0.7,
      }),
      isActive: false,
    },
    {
      userId: demoUser.id,
      provider: 'anthropic',
      config: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        maxTokens: 4000,
        temperature: 0.7,
      }),
      isActive: false,
    },
  ]);

  console.log('✅ Created provider configs');

  // Create a demo conversation
  const [demoConversation] = await db
    .insert(conversations)
    .values({
      userId: demoUser.id,
      title: 'Getting Started with AI Assistant',
      mode: 'assistant',
      provider: 'ollama',
      lastMessageAt: new Date().toISOString(),
    })
    .returning();

  console.log('✅ Created demo conversation:', demoConversation.id);

  // Create demo messages
  await db.insert(messages).values([
    {
      conversationId: demoConversation.id,
      role: 'user',
      content: 'Hello! Can you help me understand how this AI ticket automation system works?',
      mode: 'assistant',
      metadata: JSON.stringify({}),
    },
    {
      conversationId: demoConversation.id,
      role: 'assistant',
      content:
        "Hello! I'd be happy to help you understand the AI ticket automation system. This platform allows you to:\n\n1. **Assistant Mode**: Ask questions and get help with coding, architecture, and development challenges\n2. **Ticket Mode**: Describe features, bugs, or requirements, and I'll generate structured tickets with acceptance criteria and task breakdowns\n\nYou can switch between modes using the toggle in the interface. Would you like me to demonstrate either mode?",
      mode: 'assistant',
      metadata: JSON.stringify({}),
    },
  ]);

  console.log('✅ Created demo messages');

  console.log('🎉 Database seeded successfully!');
}

// Run if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
