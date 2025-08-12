'use client';

import { Button } from '@/components/ui/button';
import type { FileInfo } from '@/lib/files/file-service';
import { cn } from '@/lib/utils';
import { Download, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useEffect } from 'react';

interface ImagePreviewModalProps {
  file: FileInfo | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ImagePreviewModal({ file, isOpen, onClose }: ImagePreviewModalProps) {
  const t = useTranslations('fileManager');

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleDownload = () => {
    if (file) {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!isOpen || !file) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
    >
      <div
        className={cn(
          'relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg bg-background shadow-2xl',
          'flex flex-col'
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onClose();
          }
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-semibold text-lg" title={file.originalName}>
              {file.originalName}
            </h2>
            <p className="text-muted-foreground text-sm">
              {file.width && file.height && `${file.width} × ${file.height} • `}
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              {t('download')}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Image content */}
        <div className="flex min-h-0 flex-1 items-center justify-center p-4">
          <div className="relative max-h-full max-w-full">
            <Image
              src={file.url}
              alt={file.originalName}
              width={file.width || 800}
              height={file.height || 600}
              className="max-h-full max-w-full rounded object-contain"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
