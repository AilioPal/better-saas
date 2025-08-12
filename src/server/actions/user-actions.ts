'use server';

import { auth } from '@/lib/auth/auth';
import db from '@/server/db';
import { user } from '@/server/db/schema';
import { and, asc, count, desc, eq, gte, ilike, isNotNull, or } from 'drizzle-orm';
import { headers } from 'next/headers';
import { getUserAdminStatus } from './auth-actions';

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  paidUsers: number;
}

export interface UserListItem {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string | null; // Change to allow null
  createdAt: Date;
  emailVerified: boolean | null;
}

export interface UserListResponse {
  users: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GetUsersOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: 'name' | 'email' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Get user statistics
 */
export async function getUserStats(): Promise<UserStats> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const isAdmin = await getUserAdminStatus();
  if (!isAdmin) {
    throw new Error('Admin access required');
  }

  try {
    // Get total users
    const totalUsersResult = await db.select({ count: count() }).from(user);

    // Get active users (users who have verified their email)
    const activeUsersResult = await db
      .select({ count: count() })
      .from(user)
      .where(eq(user.emailVerified, true));

    // Get new users (registered in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newUsersResult = await db
      .select({ count: count() })
      .from(user)
      .where(gte(user.createdAt, thirtyDaysAgo));

    // For paid users, we would need to join with payment table
    // For now, let's use a placeholder
    const paidUsers = 0; // TODO: Implement when payment integration is ready

    return {
      totalUsers: totalUsersResult[0]?.count || 0,
      activeUsers: activeUsersResult[0]?.count || 0,
      newUsers: newUsersResult[0]?.count || 0,
      paidUsers,
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    throw new Error('Failed to fetch user statistics');
  }
}

/**
 * Get paginated user list
 */
export async function getUsers(options: GetUsersOptions = {}): Promise<UserListResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const isAdmin = await getUserAdminStatus();
  if (!isAdmin) {
    throw new Error('Admin access required');
  }

  const {
    page = 1,
    pageSize = 10,
    search = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const offset = (page - 1) * pageSize;

  try {
    // Build where conditions
    const conditions = [];
    if (search) {
      conditions.push(or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`)));
    }

    // Build sort condition
    const sortColumn = user[sortBy];
    const orderFn = sortOrder === 'asc' ? asc : desc;

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(user)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get users
    const userList = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        createdAt: user.createdAt,
        emailVerified: user.emailVerified,
      })
      .from(user)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderFn(sortColumn))
      .limit(pageSize)
      .offset(offset);

    const totalPages = Math.ceil((totalResult[0]?.count || 0) / pageSize);

    return {
      users: userList,
      total: totalResult[0]?.count || 0,
      page,
      pageSize,
      totalPages,
    };
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Failed to fetch users');
  }
}
