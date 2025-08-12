'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { FileInfo } from '@/lib/files/file-service';
import { cn } from '@/lib/utils';
import { Download, Eye, MoreHorizontal, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import Image from 'next/image';
import { useState } from 'react';

interface FileTableProps {
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
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function formatDate(dateString: string, locale: string): string {
  return new Date(dateString).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function FileTable({
  files,
  loading = false,
  onDelete,
  onPreview,
  className,
}: FileTableProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const t = useTranslations('fileManager');
  const locale = useLocale();

  const handleImageError = (fileId: string) => {
    setImageErrors((prev) => new Set(prev).add(fileId));
  };

  const handleDownload = (file: FileInfo) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className={cn('rounded-md border', className)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">{t('preview')}</TableHead>
              <TableHead>{t('type')}</TableHead>
              <TableHead>{t('size')}</TableHead>
              <TableHead>{t('uploadUser')}</TableHead>
              <TableHead>{t('lastModified')}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }, (_, index) => (
              <TableRow key={`skeleton-${Math.random().toString(36).slice(2, 10)}`}>
                <TableCell>
                  <Skeleton className="h-12 w-16 rounded" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8 rounded" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border py-12 text-center">
        <div className="mb-4 rounded-full bg-muted/50 p-4">
          <Eye className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 font-semibold text-lg text-muted-foreground">{t('noFiles')}</h3>
        <p className="text-muted-foreground text-sm">{t('uploadSomeFiles')}</p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-md border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">{t('preview')}</TableHead>
            <TableHead>{t('type')}</TableHead>
            <TableHead>{t('size')}</TableHead>
            <TableHead>{t('uploadUser')}</TableHead>
            <TableHead>{t('lastModified')}</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.id} className="group">
              <TableCell>
                <div className="flex h-12 w-16 items-center justify-center overflow-hidden rounded border bg-muted/20">
                  {imageErrors.has(file.id) ? (
                    <Eye className="h-6 w-6 text-muted-foreground" />
                  ) : (
                    <Image
                      src={file.thumbnailUrl || file.url}
                      alt={file.originalName}
                      width={64}
                      height={48}
                      className="h-full w-full object-cover"
                      onError={() => handleImageError(file.id)}
                    />
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span
                    className="max-w-[200px] truncate font-medium text-sm"
                    title={file.originalName}
                  >
                    {file.originalName}
                  </span>
                  <Badge variant="secondary" className="mt-1 w-fit text-xs">
                    {t('image')}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground text-sm">{formatFileSize(file.size)}</span>
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground text-sm">
                  {file.uploadUserEmail || file.uploadUserId}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground text-sm">
                  {formatDate(file.createdAt, locale)}
                </span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                    >
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
