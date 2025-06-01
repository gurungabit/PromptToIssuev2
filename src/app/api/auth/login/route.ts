import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, userSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { email, username } = await request.json();

    console.log('Login request received:', { email, username });

    if (!email && !username) {
      return NextResponse.json(
        { message: 'Email and username are required' },
        { status: 400 }
      );
    }

    // Try to find existing user by email or username
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let user;

    if (existingUser.length > 0) {
      // Check if the username is the same
      if (existingUser[0].username !== username) {
        return NextResponse.json(
          { message: 'Login failed, please check your username and email' },
          { status: 400 }
        );
      }
      // User exists, update last login
      user = existingUser[0];
      await db
        .update(users)
        .set({ 
          lastLogin: new Date(),
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          username,
          fullName: username, // Default to username
          lastLogin: new Date(),
          isActive: true,
        })
        .returning();

      user = newUser;

      // Create default user settings
      await db.insert(userSettings).values({
        userId: user.id,
        theme: 'dark',
        defaultMode: 'ticket',
        defaultProvider: 'ollama',
        providerConfigs: {
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
        },
      });
    }

    return NextResponse.json({
      success: true,
      user,
      message: existingUser.length > 0 ? 'Login successful' : 'Account created and logged in'
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 