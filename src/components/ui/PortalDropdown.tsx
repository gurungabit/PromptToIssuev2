'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface PortalDropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const PortalDropdown: React.FC<PortalDropdownProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Select an option...',
  disabled = false,
  className,
  size = 'sm',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find(option => option.value === value);

  const sizeClasses = {
    sm: 'text-xs px-2 py-1.5',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3',
  };

  // Calculate dropdown position when opening
  const calculatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      setDropdownPosition({
        top: rect.bottom + scrollY,
        left: rect.left + scrollX,
        width: rect.width,
      });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        // Check if click is on dropdown menu (which is portaled)
        const target = event.target as Element;
        if (!target.closest('[data-portal-dropdown]')) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle window resize and scroll
  useEffect(() => {
    const handleResize = () => {
      if (isOpen) {
        calculatePosition();
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        calculatePosition();
      }
    };

    if (isOpen) {
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      if (!isOpen) {
        calculatePosition();
      }
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const DropdownMenu = () => (
    <div
      data-portal-dropdown
      style={{
        position: 'fixed',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        zIndex: 999999,
      }}
      className="bg-background border border-border rounded-md shadow-2xl max-h-60 overflow-y-auto"
    >
      {options.length === 0 ? (
        <div className="px-3 py-2 text-sm text-muted-foreground">No options available</div>
      ) : (
        options.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => !option.disabled && handleSelect(option.value)}
            disabled={option.disabled}
            className={cn(
              'w-full px-3 py-2 text-sm text-left transition-colors duration-200 block',
              !option.disabled && 'cursor-pointer hover:bg-accent hover:text-accent-foreground',
              option.disabled && 'opacity-50 cursor-not-allowed',
              value === option.value && 'bg-accent text-accent-foreground font-medium'
            )}
          >
            {option.label}
          </button>
        ))
      )}
    </div>
  );

  return (
    <div className={cn('relative', className)}>
      {/* Dropdown Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          'w-full border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all duration-200 text-left flex items-center justify-between',
          sizeClasses[size],
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'cursor-pointer'
        )}
      >
        <span className={cn('truncate', !selectedOption && 'text-muted-foreground')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform duration-200 flex-shrink-0 ml-2',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Portal Dropdown Menu */}
      {isOpen && typeof document !== 'undefined' && createPortal(<DropdownMenu />, document.body)}
    </div>
  );
};

export { PortalDropdown };
export type { DropdownOption, PortalDropdownProps };
