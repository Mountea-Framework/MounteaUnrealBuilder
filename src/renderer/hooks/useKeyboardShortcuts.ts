import React, { useEffect } from 'react';

interface ShortcutHandler {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = (handlers: ShortcutHandler[]) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const handler of handlers) {
        const keyMatch = event.key.toLowerCase() === handler.key.toLowerCase();
        const ctrlMatch = handler.ctrlKey === undefined || event.ctrlKey === handler.ctrlKey;
        const shiftMatch = handler.shiftKey === undefined || event.shiftKey === handler.shiftKey;
        const altMatch = handler.altKey === undefined || event.altKey === handler.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          handler.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
};

export const SHORTCUTS = {
  DASHBOARD: { key: '1', ctrlKey: true, description: 'Go to Dashboard' },
  ENGINE_CONFIG: { key: '2', ctrlKey: true, description: 'Go to Engine Config' },
  BUILD_QUEUE: { key: '3', ctrlKey: true, description: 'Go to Build Queue' },
  SETTINGS: { key: ',', ctrlKey: true, description: 'Open Settings' },
  BUILD_CURRENT: { key: 'b', ctrlKey: true, description: 'Build first project' },
  CANCEL_BUILD: { key: 'x', ctrlKey: true, shiftKey: true, description: 'Cancel current build' },
  HELP: { key: '/', ctrlKey: true, description: 'Show keyboard shortcuts' },
};