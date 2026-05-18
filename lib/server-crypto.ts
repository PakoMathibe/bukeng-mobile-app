// lib/server-crypto.ts
// This file is ONLY for server-side use (API routes, middleware)
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_min_32_chars_long';
const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: string, email: string, expiresIn: string = '7d'): string {
  return jwt.sign({ userId, email, type: 'access' }, JWT_SECRET, {
    expiresIn,
    issuer: 'bukeng',
    audience: 'bukeng-users',
  });
}

export function generateRefreshToken(userId: string, email: string): string {
  return jwt.sign({ userId, email, type: 'refresh' }, JWT_SECRET, {
    expiresIn: '30d',
    issuer: 'bukeng',
    audience: 'bukeng-users',
  });
}

export function verifyToken(token: string): { userId: string; email: string; type: string; iat: number; exp: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'bukeng',
      audience: 'bukeng-users',
    }) as any;
  } catch (error) {
    return null;
  }
}