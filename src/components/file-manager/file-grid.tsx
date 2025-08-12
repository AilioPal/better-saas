'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import type { FileInfo } from '@/lib/files/file-service';
import { cn } from '@/lib/utils';
import { Download, Eye, MoreHorizontal, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import Image from 'next/image';
import { useState } from 'react';

interface FileGridProps {
  files: FileInfo[];
  loading?: boolean;
  onDelete?: (fileId: string) => void;
  onPreview?: (file: FileInfo) => void;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateString: string, locale: string): string {
  return new Date(dateString).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function FileGrid({
  files,
  loading = false,
  onDelete,
  onPreview,
  className,
}: FileGridProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const t = useTranslations('fileManager');
  const locale = useLocale();

  const handleImageError = (fileId: string) => {
    setImageErrors((prev) => new Set(prev).add(fileId));
  };

  const handleDownload = (file: FileInfo) => {
    if (file.url) {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div
        className={cn(
          'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
          className
        )}
      >
        {Array.from({ length: 8 }, (_, index) => `skeleton-${index}-${Date.now()}`).map((key) => (
          <Card key={key}>
            <CardContent className="p-4">
              <Skeleton className="mb-3 aspect-square w-full rounded-lg" />
              <Skeleton className="mb-2 h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 rounded-full bg-muted/50 p-4">
          <Eye className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 font-semibold text-lg text-muted-foreground">{t('noFiles')}</h3>
        <p className="text-muted-foreground text-sm">{t('uploadSomeFiles')}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        className
      )}
    >
      {files.map((file) => (
        <Card key={file.id} className="group overflow-hidden">
          <CardContent className="p-0">
            {/* Image preview */}
            <div className="relative aspect-square overflow-hidden">
              {imageErrors.has(file.id) ? (
                <div className="flex h-full items-center justify-center bg-muted">
                  <Eye className="h-8 w-8 text-muted-foreground" />
                </div>
              ) : (
                <Image
                  src={file.thumbnailUrl || file.url || ''}
                  alt={file.originalName}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  onError={() => handleImageError(file.id)}
                />
              )}

              {/* Hover action buttons */}
              <div className="absolute inset-0 flex items-center justify-center space-x-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Button size="sm" variant="secondary" onClick={() => onPreview?.(file)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleDownload(file)}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* File info */}
            <div className="p-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h4 className="truncate font-medium text-sm" title={file.originalName}>
                    {file.originalName}
                  </h4>
                  <div className="mt-1 flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {formatFileSize(file.size)}
                    </Badge>
                    {file.width && file.height && (
                      <Badge variant="outline" className="text-xs">
                        {file.width}×{file.height}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-muted-foreground text-xs">
                    {formatDate(file.createdAt, locale)}
                  </p>
                </div>

                {/* Action menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onPreview?.(file)}>
                      <Eye className="mr-2 h-4 w-4" />
                      {t('preview')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload(file)}>
                      <Download className="mr-2 h-4 w-4" />
                      {t('download')}
                    </DropdownMenuItem>
                    {onDelete && (
                      <DropdownMenuItem
                        onClick={() => onDelete(file.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('delete')}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
