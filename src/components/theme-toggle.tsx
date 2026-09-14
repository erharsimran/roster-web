'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-[102px] h-8 rounded-lg bg-card border border-card-border" />;
  }

  return (
    <div className="flex items-center gap-0.5 bg-neutral-200/60 dark:bg-neutral-900 border border-card-border dark:border-neutral-800 rounded-lg p-0.5">
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`p-1.5 rounded-md transition-colors ${
          theme === 'light'
            ? 'bg-white dark:bg-neutral-800 text-amber-500 shadow-sm'
            : 'text-muted-foreground hover:text-neutral-900 dark:hover:text-neutral-200'
        }`}
        title="Light Mode"
      >
        <Sun className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`p-1.5 rounded-md transition-colors ${
          theme === 'dark'
            ? 'bg-white dark:bg-neutral-800 text-sky-400 shadow-sm'
            : 'text-muted-foreground hover:text-neutral-900 dark:hover:text-neutral-200'
        }`}
        title="Dark Mode"
      >
        <Moon className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setTheme('system')}
        className={`p-1.5 rounded-md transition-colors ${
          theme === 'system'
            ? 'bg-white dark:bg-neutral-800 text-emerald-500 shadow-sm'
            : 'text-muted-foreground hover:text-neutral-900 dark:hover:text-neutral-200'
        }`}
        title="System Preference"
      >
        <Monitor className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}