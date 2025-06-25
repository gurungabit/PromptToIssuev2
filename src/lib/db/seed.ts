import { 
  UserRepository, 
  ConversationRepository, 
  MessageRepository,
  ProviderConfigRepository 
} from './repositories';
import { stringifyJsonField } from './utils';

export async function seedDatabase() {
  console.log('🌱 Seeding DynamoDB database...');

  const userRepo = new UserRepository();
  const conversationRepo = new ConversationRepository();
  const messageRepo = new MessageRepository();
  const providerConfigRepo = new ProviderConfigRepository();

  try {
    // Create a demo user
    const demoUser = await userRepo.createUser({
      email: 'demo@example.com',
      username: 'demo',
      fullName: 'Demo User',
      isActive: true,
    });

    console.log('✅ Created demo user:', demoUser.id);

    // Create user settings
    await userRepo.createUserSettings({
      userId: demoUser.id,
      theme: 'dark',
      defaultMode: 'assistant',
      defaultProvider: 'ollama',
      providerConfigs: stringifyJsonField({
        ollama: { model: 'llama2' },
        openai: { model: 'gpt-3.5-turbo' },
      }),
    });

    console.log('✅ Created user settings for:', demoUser.id);

    // Create provider configurations
    await providerConfigRepo.createProviderConfig({
      userId: demoUser.id,
      provider: 'ollama',
      config: stringifyJsonField({
        baseUrl: 'http://localhost:11434',
        model: 'llama2',
        temperature: 0.7,
      }),
      isActive: true,
    });

    await providerConfigRepo.createProviderConfig({
      userId: demoUser.id,
      provider: 'openai',
      config: stringifyJsonField({
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 2000,
      }),
      isActive: false, // Not active by default since it requires API key
    });

    console.log('✅ Created provider configs');

    // Create a demo conversation
    const demoConversation = await conversationRepo.createConversation({
      userId: demoUser.id,
      title: 'Getting Started with AI Assistant',
      mode: 'assistant',
      provider: 'ollama',
      isArchived: false,
    });

    console.log('✅ Created demo conversation:', demoConversation.id);

    // Create demo messages
    await messageRepo.createMessage({
      conversationId: demoConversation.id,
      role: 'user',
      content: 'Hello! Can you help me understand how this AI ticket automation system works?',
      mode: 'assistant',
      metadata: stringifyJsonField({}),
    });

    const assistantMessage = await messageRepo.createMessage({
      conversationId: demoConversation.id,
      role: 'assistant',
      content: "Hello! I'd be happy to help you understand the AI ticket automation system. This platform allows you to:\n\n1. **Assistant Mode**: Ask questions and get help with coding, architecture, and development challenges\n2. **Ticket Mode**: Describe features, bugs, or requirements, and I'll generate structured tickets with acceptance criteria and task breakdowns\n\nYou can switch between modes using the toggle in the interface. Would you like me to demonstrate either mode?",
      mode: 'assistant',
      metadata: stringifyJsonField({}),
    });

    // Update conversation with last message timestamp
    await conversationRepo.updateConversation(demoConversation.id, demoUser.id, {
      lastMessageAt: assistantMessage.createdAt,
    });

    console.log('✅ Created demo messages');
    console.log('🎉 Database seeded successfully!');
    console.log('📋 Summary:');
    console.log(`   - User: ${demoUser.email} (${demoUser.id})`);
    console.log(`   - Conversation: ${demoConversation.title} (${demoConversation.id})`);
    console.log(`   - Messages: 2`);
    console.log(`   - Provider Configs: 2`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}
