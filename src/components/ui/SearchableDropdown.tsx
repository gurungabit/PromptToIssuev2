'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './Input';

interface SearchableDropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SearchableDropdownProps {
  value: string;
  options: SearchableDropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  disabled?: boolean;
  maxHeight?: string;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search options...',
  className,
  size = 'sm',
  icon,
  disabled = false,
  maxHeight = '200px',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(option => option.value === value);

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3',
  };

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm('');
      }
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          'rounded-full font-medium border border-border bg-background text-foreground transition-all duration-200 flex items-center gap-1 w-full justify-between',
          !disabled && 'cursor-pointer hover:bg-accent hover:border-primary/40',
          disabled && 'opacity-50 cursor-not-allowed',
          sizeClasses[size],
          className
        )}
      >
        <div className="flex items-center gap-1 min-w-0">
          {icon && icon}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown
          className={cn('w-3 h-3 transition-transform duration-200 flex-shrink-0', isOpen && 'rotate-180')}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[300px] glass rounded-[12px] shadow-xl z-50 border border-border/50">
          <div className="p-2">
            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
                size="sm"
              />
            </div>

            {/* Options List */}
            <div 
              className="overflow-y-auto"
              style={{ maxHeight }}
            >
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                  No options found
                </div>
              ) : (
                filteredOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm rounded-[8px] transition-all duration-200 cursor-pointer flex items-center gap-2',
                      'hover:bg-accent hover:scale-[1.02] hover:shadow-sm',
                      value === option.value && 'bg-accent text-accent-foreground font-medium'
                    )}
                  >
                    {option.icon && option.icon}
                    <span className="truncate">{option.label}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { SearchableDropdown };
export type { SearchableDropdownOption, SearchableDropdownProps };