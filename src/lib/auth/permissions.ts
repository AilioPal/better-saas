import { env } from '@/env';
import type { User } from 'better-auth/types';

export function getAdminEmails(): string[] {
  if (!env.ADMIN_EMAILS) {
    return [];
  }

  return env.ADMIN_EMAILS.split(',')
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
}

export function isAdmin(user: User | null): boolean {
  if (!user) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  if (user.email) {
    const adminEmails = getAdminEmails();
    return adminEmails.includes(user.email);
  }

  return false;
}

export function isAdminEmail(email: string): boolean {
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email);
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export function getUserRole(user: User | null): UserRole {
  if (isAdmin(user)) {
    return UserRole.ADMIN;
  }
  return UserRole.USER;
}
