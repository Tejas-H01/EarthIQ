"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}

export function CustomSelect({ value, onChange, options }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    if (!isOpen) {
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (isOpen) {
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          onChange(options[highlightedIndex].value);
        }
        setIsOpen(false);
      } else {
        setIsOpen(true);
        const idx = options.findIndex((opt) => opt.value === value);
        setHighlightedIndex(idx >= 0 ? idx : 0);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) => (prev + 1) % options.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(options.length - 1);
      } else {
        setHighlightedIndex((prev) => (prev - 1 + options.length) % options.length);
      }
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className="field-control flex items-center justify-between text-left cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          backgroundImage: "none",
        }}
      >
        <span className="truncate">{selectedOption?.label}</span>
        <svg
          className={`h-4 w-4 text-white/40 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Options dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            role="listbox"
            aria-activedescendant={highlightedIndex >= 0 ? options[highlightedIndex].value : undefined}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 4 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 z-30 mt-1 max-h-60 overflow-y-auto rounded-2xl border border-white/10 bg-black/90 p-1.5 shadow-2xl backdrop-blur-xl"
            style={{
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.6)",
            }}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;

              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`relative flex min-h-[44px] cursor-pointer items-center rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                    isSelected
                      ? "bg-[#A3FFB0] text-black"
                      : isHighlighted
                      ? "bg-white/10 text-white"
                      : "text-white/75 hover:text-white"
                  }`}
                >
                  <span className="block truncate">{option.label}</span>
                  {isSelected && (
                    <span className="absolute right-4 flex items-center">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
