import { NextRequest, NextResponse } from 'next/server';
import { UserRepository } from '@/lib/db/repositories';
import { stringifyJsonField } from '@/lib/db/utils';

export async function POST(request: NextRequest) {
  try {
    const { email, username } = await request.json();

    if (!email && !username) {
      return NextResponse.json({ message: 'Email and username are required' }, { status: 400 });
    }

    const userRepo = new UserRepository();

    // Try to find existing user by email
    const existingUser = await userRepo.getUserByEmail(email);

    let user;

    if (existingUser) {
      // Check if the username is the same
      if (existingUser.username !== username) {
        return NextResponse.json(
          { message: 'Login failed, please check your username and email' },
          { status: 400 }
        );
      }
      // User exists, update last login
      user = existingUser;
      await userRepo.updateUser(user.id, {
        lastLogin: new Date().toISOString(),
      });
    } else {
      // Create new user
      user = await userRepo.createUser({
        email,
        username,
        fullName: username, // Default to username
        lastLogin: new Date().toISOString(),
        isActive: true,
      });

      // Create default user settings
      await userRepo.createUserSettings({
        userId: user.id,
        theme: 'dark',
        defaultMode: 'ticket',
        defaultProvider: 'ollama',
        providerConfigs: stringifyJsonField({
          ollama: {
            provider: 'ollama',
            model: 'mistral:latest',
            baseUrl: 'http://localhost:11434',
            maxTokens: 4000,
            temperature: 0.7,
          },
          openai: {
            provider: 'openai',
            model: 'gpt-3.5-turbo',
            maxTokens: 4000,
            temperature: 0.7,
          },
          anthropic: {
            provider: 'anthropic',
            model: 'claude-3-haiku-20240307',
            maxTokens: 4000,
            temperature: 0.7,
          },
          google: {
            provider: 'google',
            model: 'gemini-pro',
            maxTokens: 4000,
            temperature: 0.7,
          },
        }),
      });
    }

    return NextResponse.json({
      success: true,
      user,
      message: existingUser ? 'Login successful' : 'Account created and logged in',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
