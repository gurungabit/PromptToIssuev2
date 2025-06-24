'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Copy, Check } from 'lucide-react';
import { codeToHtml } from 'shiki';

interface CodeBlockProps {
  code: string;
  language: string;
  blockKey: string;
  isCopied: boolean;
  onCopy: (code: string, blockKey: string) => void;
  isDark: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language,
  blockKey,
  isCopied,
  onCopy,
  isDark,
}) => {
  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const [isHighlighting, setIsHighlighting] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const highlightCode = async () => {
      setIsHighlighting(true);
      try {
        const html = await codeToHtml(code, {
          lang: language,
          theme: isDark ? 'dark-plus' : 'light-plus',
        });
        if (isMounted) {
          setHighlightedCode(html);
          setIsHighlighting(false);
        }
      } catch {
        // Fallback for unsupported languages
        if (isMounted) {
          setHighlightedCode(`<pre class="bg-muted rounded p-4"><code>${code}</code></pre>`);
          setIsHighlighting(false);
        }
      }
    };

    highlightCode();

    return () => {
      isMounted = false;
    };
  }, [code, language, isDark]); // Re-highlight when code, language, or theme changes

  // Memoize the copy button to prevent re-renders when highlighting changes
  const copyButton = useMemo(
    () => (
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 px-2 text-xs bg-background/80 backdrop-blur-sm border border-border/30 hover:bg-background/90"
        onClick={() => onCopy(code, blockKey)}
      >
        {isCopied ? (
          <>
            <Check className="w-3 h-3 mr-1 text-green-500" />
            <span className="text-green-500">Copied</span>
          </>
        ) : (
          <>
            <Copy className="w-3 h-3 mr-1" />
            <span>Copy</span>
          </>
        )}
      </Button>
    ),
    [isCopied, onCopy, code, blockKey]
  );

  if (isHighlighting && !highlightedCode) {
    // Show a simple fallback while highlighting
    return (
      <div className="relative group">
        <pre className="bg-muted rounded-lg mt-2 mb-2 p-4 overflow-x-auto">
          <code>{code}</code>
        </pre>
        {copyButton}
      </div>
    );
  }

  return (
    <div className="relative group">
      <div
        className="rounded-lg mt-2 mb-2 overflow-x-auto [&_pre]:!bg-transparent [&_pre]:!p-4 [&_pre]:!m-0 [&_code]:!bg-transparent"
        dangerouslySetInnerHTML={{ __html: highlightedCode }}
      />
      {copyButton}
    </div>
  );
};

export { CodeBlock };
