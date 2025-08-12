'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppConfig } from '@/hooks/use-config';
import type { ProfileContentProps } from '@/types/profile';
import { Camera, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

export function ProfileContent({
  user,
  formData,
  setFormData,
  isUpdatingName,
  isUpdatingAvatar,
  handleUpdateName,
  handleUpdateAvatar,
  getUserInitials,
  hasNameChanged,
}: ProfileContentProps) {
  const t = useTranslations('profile');
  const locale = useLocale();
  const appConfig = useAppConfig();
  const [selectedLanguage, setSelectedLanguage] = useState(locale === 'zh' ? 'zh' : 'en');

  const handleAvatarUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = appConfig.upload.allowedTypes.join(',');
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (!appConfig.upload.allowedTypes.includes(file.type)) {
          toast.error('仅支持 JPEG 和 PNG 格式的图片');
          return;
        }

        if (file.size > appConfig.upload.maxFileSize) {
          toast.error('文件大小不能超过 10MB');
          return;
        }

        await handleUpdateAvatar(file);
      }
    };
    input.click();
  };

  const handleSaveEmail = () => {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <div className="grid gap-6">
        {/* Avatar settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('avatar.title')}</CardTitle>
            <CardDescription>
              {t('avatar.description')} 仅支持 JPEG 和 PNG 格式，最大 10MB
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user?.image || ''} alt="Avatar" />
                  <AvatarFallback className="text-lg">{getUserInitials()}</AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="outline"
                  className="-bottom-2 -right-2 absolute h-8 w-8 rounded-full p-0"
                  onClick={handleAvatarUpload}
                  disabled={isUpdatingAvatar}
                >
                  {isUpdatingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('language.title')}</CardTitle>
            <CardDescription>{t('language.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="language">{t('language.label')}</Label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Name settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('name.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={t('name.placeholder')}
                />
              </div>
              <Button
                onClick={handleUpdateName}
                variant="outline"
                disabled={isUpdatingName || !hasNameChanged}
              >
                {isUpdatingName ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  t('save')
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Email settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('email.title')}</CardTitle>
            <CardDescription>{t('email.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder={t('email.placeholder')}
                  disabled
                />
              </div>
              <Button onClick={handleSaveEmail} variant="outline" disabled>
                {t('save')}
              </Button>
            </div>
            <p className="mt-2 text-muted-foreground text-sm">邮箱更改需要验证，此功能正在开发中</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
