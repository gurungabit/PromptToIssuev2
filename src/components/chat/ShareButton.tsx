'use client';

import React, { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Button } from '@/components/ui/Button';
import { Share2, Copy, ExternalLink, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShareButtonProps {
  conversationId: string;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'ghost' | 'outline' | 'default';
  className?: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  conversationId,
  size = 'sm',
  variant = 'ghost',
  className,
}) => {
  const { createShareLink, removeShareLink } = useChat();
  const [isLoading, setIsLoading] = useState(false);
  const [shareData, setShareData] = useState<{ shareId: string; shareUrl: string } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (shareData) {
      // Already shared, show the modal
      setShowShareModal(true);
      return;
    }

    try {
      setIsLoading(true);
      const result = await createShareLink(conversationId);
      setShareData(result);
      setShowShareModal(true);
    } catch (error) {
      console.error('Failed to create share link:', error);
      // You could add a toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (shareData?.shareUrl) {
      try {
        await navigator.clipboard.writeText(shareData.shareUrl);
        setCopied(true);
        // Reset copy feedback after 2 seconds
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy link:', error);
      }
    }
  };

  const handleRemoveShare = async () => {
    try {
      setIsLoading(true);
      await removeShareLink(conversationId);
      setShareData(null);
      setShowShareModal(false);
    } catch (error) {
      console.error('Failed to remove share link:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenInNewTab = () => {
    if (shareData?.shareUrl) {
      window.open(shareData.shareUrl, '_blank');
    }
  };

  const handleCloseModal = () => {
    setShowShareModal(false);
    setCopied(false); // Reset copy state when closing
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleShare}
        disabled={isLoading}
        className={cn(
          'transition-all duration-200 cursor-pointer',
          shareData ? 'text-blue-500 hover:text-blue-600' : '',
          className
        )}
        title={shareData ? 'Manage share link' : 'Create share link'}
      >
        <Share2 className="w-4 h-4" />
      </Button>

      {/* Share Modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[99999] cursor-pointer"
          onClick={handleCloseModal}
        >
          <div
            className="bg-background border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl cursor-default"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Share Conversation</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseModal}
                className="rounded-full w-8 h-8 p-0 cursor-pointer hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {shareData && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">
                    Share URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={shareData.shareUrl}
                      readOnly
                      className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm cursor-text select-all"
                      onClick={e => (e.target as HTMLInputElement).select()}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                      className={cn(
                        'px-3 cursor-pointer transition-all duration-200 hover:bg-accent hover:scale-105',
                        copied ? 'bg-green-100 border-green-300 text-green-700' : ''
                      )}
                      title={copied ? 'Copied!' : 'Copy to clipboard'}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  {copied && (
                    <p className="text-xs text-green-600 mt-1 animate-fade-in">
                      ✓ Copied to clipboard!
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleOpenInNewTab}
                    className="flex-1 cursor-pointer hover:bg-accent hover:scale-105 transition-all duration-200"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleRemoveShare}
                    disabled={isLoading}
                    className="flex-1 cursor-pointer hover:bg-red-600 hover:scale-105 transition-all duration-200 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isLoading ? 'Removing...' : 'Remove Share'}
                  </Button>
                </div>

                <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                  <p className="text-xs text-muted-foreground">
                    🔗 Anyone with this link can view this conversation. Remove the share link to
                    revoke access.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
