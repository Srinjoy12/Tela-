import React, { useEffect } from 'react';
import {
  Cross2Icon as X
} from '@radix-ui/react-icons';
import { Button } from '../ui/button';

interface BWModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const BWModal: React.FC<BWModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '600px',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="bw-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="bw-modal-content"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between" style={{ padding: '1rem', borderBottom: '2px solid #000' }}>
          <h2 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{title}</h2>
          <Button
            onClick={onClose}
            type="secondary"
            size="small"
            svgOnly
            aria-label="Close dialog"
          >
            <X width={16} height={16} />
          </Button>
        </div>
        <div style={{ padding: '1.25rem' }}>{children}</div>
      </div>
    </div>
  );
};
