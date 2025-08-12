'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PaginationControls } from '@/components/ui/pagination';
import { useAppConfig } from '@/hooks/use-config';
import { useFiles } from '@/hooks/use-files';
import type { FileInfo } from '@/lib/files/file-service';
import { Search, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FileTable } from './file-table';
import { FileUpload } from './file-upload';
import { ImagePreviewModal } from './image-preview-modal';

export function FileManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const appConfig = useAppConfig();
  const t = useTranslations('fileManager');

  const { files, isLoading, error, uploadFile, deleteFile, isUploading, pagination } = useFiles({
    search: searchQuery,
    page: currentPage,
    limit: appConfig.pagination.defaultPageSize,
  });

  const handlePreview = (file: FileInfo) => {
    setPreviewFile(file);
  };

  return (
    <div className="space-y-6">
      {/* Page title and description */}
      <div className="flex flex-col space-y-2">
        <h1 className="font-bold text-2xl">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* Upload area */}
      {showUpload ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">{t('uploadFile')}</h2>
            <Button variant="outline" onClick={() => setShowUpload(false)}>
              {t('cancel')}
            </Button>
          </div>
          <FileUpload
            onUpload={async (files) => {
              for (const file of files) {
                await uploadFile(file);
              }
              setShowUpload(false);
            }}
            loading={isUploading}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-80 pl-10"
              />
            </div>
          </div>
          <Button onClick={() => setShowUpload(true)}>
            <Upload className="mr-2 h-4 w-4" />
            {t('uploadFile')}
          </Button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* File table */}
      <FileTable
        files={files}
        loading={isLoading}
        onDelete={deleteFile}
        onPreview={handlePreview}
      />

      {/* Pagination */}
      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between">
          <PaginationControls
            currentPage={pagination.page}
            totalPages={Math.ceil(pagination.total / pagination.limit)}
            onPageChange={(page: number) => {
              setCurrentPage(page);
            }}
          />
        </div>
      )}

      {/* Image preview modal */}
      <ImagePreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
