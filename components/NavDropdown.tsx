'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

interface NavDropdownProps {
  title: string;
  items: Array<{
    label: string;
    href: string;
    description?: string;
  }>;
  isActive?: boolean;
}

export default function NavDropdown({ title, items, isActive }: NavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Desktop Dropdown */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`hidden md:flex items-center gap-1 px-3 py-2 text-sm font-medium transition ${
          isActive
            ? 'text-blue-400 border-b-2 border-blue-400'
            : 'text-gray-300 hover:text-white'
        }`}
      >
        {title}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
          {items.map((item, idx) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`block px-4 py-3 text-sm hover:bg-gray-700 transition ${
                idx === 0 ? 'rounded-t-lg' : ''
              } ${idx === items.length - 1 ? 'rounded-b-lg' : 'border-b border-gray-700'}`}
            >
              <div className="font-medium text-white">{item.label}</div>
              {item.description && (
                <div className="text-xs text-gray-400 mt-0.5">{item.description}</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
