'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import toast, { Toaster, ToastOptions } from 'react-hot-toast';

// Toast notification types
export type ToastType = 'success' | 'error' | 'loading' | 'info';

// Toast context interface
interface ToastContextType {
  showToast: (message: string, type?: ToastType, options?: ToastOptions) => string;
  showSuccess: (message: string, options?: ToastOptions) => string;
  showError: (message: string, options?: ToastOptions) => string;
  showLoading: (message: string, options?: ToastOptions) => string;
  showInfo: (message: string, options?: ToastOptions) => string;
  dismissToast: (toastId: string) => void;
  dismissAllToasts: () => void;
}

// Create the context
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Toast provider component
interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const showToast = (message: string, type: ToastType = 'info', options?: ToastOptions): string => {
    const defaultOptions: ToastOptions = {
      duration: 4000,
      position: 'top-right',
      ...options,
    };

    switch (type) {
      case 'success':
        return toast.success(message, defaultOptions);
      case 'error':
        return toast.error(message, defaultOptions);
      case 'loading':
        return toast.loading(message, defaultOptions);
      case 'info':
      default:
        return toast(message, defaultOptions);
    }
  };

  const showSuccess = (message: string, options?: ToastOptions): string => {
    return toast.success(message, {
      duration: 4000,
      position: 'top-right',
      ...options,
    });
  };

  const showError = (message: string, options?: ToastOptions): string => {
    return toast.error(message, {
      duration: 5000,
      position: 'top-right',
      ...options,
    });
  };

  const showLoading = (message: string, options?: ToastOptions): string => {
    return toast.loading(message, {
      position: 'top-right',
      ...options,
    });
  };

  const showInfo = (message: string, options?: ToastOptions): string => {
    return toast(message, {
      duration: 4000,
      position: 'top-right',
      icon: 'ℹ️',
      ...options,
    });
  };

  const dismissToast = (toastId: string): void => {
    toast.dismiss(toastId);
  };

  const dismissAllToasts = (): void => {
    toast.dismiss();
  };

  const contextValue: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showLoading,
    showInfo,
    dismissToast,
    dismissAllToasts,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // Default options for all toasts
          className: '',
          duration: 4000,
          style: {
            background: 'var(--background)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: '14px',
            padding: '12px 16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
          success: {
            duration: 4000,
            style: {
              background: '#10b981',
              color: '#ffffff',
              border: '1px solid #059669',
            },
            iconTheme: {
              primary: '#ffffff',
              secondary: '#10b981',
            },
          },
          error: {
            duration: 5000,
            style: {
              background: '#ef4444',
              color: '#ffffff',
              border: '1px solid #dc2626',
            },
            iconTheme: {
              primary: '#ffffff',
              secondary: '#ef4444',
            },
          },
          loading: {
            style: {
              background: '#3b82f6',
              color: '#ffffff',
              border: '1px solid #2563eb',
            },
            iconTheme: {
              primary: '#ffffff',
              secondary: '#3b82f6',
            },
          },
        }}
      />
    </ToastContext.Provider>
  );
};

// Custom hook to use toast context
export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);

  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
};

// Export additional utilities
export { toast } from 'react-hot-toast';
export type { ToastOptions } from 'react-hot-toast';
