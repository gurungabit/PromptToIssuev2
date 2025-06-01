'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Loader2, MessageSquare, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';

const LoginForm: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');

    if (!formData.email.trim() || !formData.username.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await login(formData.email.trim(), formData.username.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      return;
    }
  };

  const handleChange =
    (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({
        ...prev,
        [field]: e.target.value,
      }));
      setError(''); // Clear error when user types
    };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl">
            <div className="flex">
              <Ticket className="w-6 h-6 text-white mr-1" />
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">AI Ticket Automation</h1>
          <p className="text-muted-foreground">Sign in to create tickets and get AI assistance</p>
        </div>

        {/* Login Form */}
        <div className="bg-card border rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange('email')}
                  disabled={isLoading}
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium mb-2">
                  Username
                </label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={handleChange('username')}
                  disabled={isLoading}
                  className="w-full"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className={cn(
                'w-full h-12 text-base font-medium relative overflow-hidden',
                'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500',
                'hover:from-blue-600 hover:via-purple-600 hover:to-pink-600',
                'transform transition-all duration-300 ease-out',
                'hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/25',
                'active:scale-[0.98] active:shadow-lg',
                'before:absolute before:inset-0 before:bg-gradient-to-r',
                'before:from-white/20 before:via-white/10 before:to-transparent',
                'before:translate-x-[-100%] hover:before:translate-x-[100%]',
                'before:transition-transform before:duration-700 before:ease-out',
                'disabled:hover:scale-100 disabled:hover:shadow-none',
                'disabled:opacity-70 disabled:cursor-not-allowed'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <span className="relative z-10">Sign In</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 opacity-0 hover:opacity-100 transition-opacity duration-300" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account? One will be created automatically when you sign in.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-2 gap-4 text-center">
          <div className="bg-card/50 rounded-xl p-4 border">
            <Ticket className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-sm font-medium">Ticket Mode</p>
            <p className="text-xs text-muted-foreground">Create structured tickets</p>
          </div>
          <div className="bg-card/50 rounded-xl p-4 border">
            <MessageSquare className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium">Assistant Mode</p>
            <p className="text-xs text-muted-foreground">Get coding help</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export { LoginForm };
