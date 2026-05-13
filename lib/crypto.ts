// lib/crypto.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_min_32_chars_long';
const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(
  userId: string,
  email: string,
  expiresIn: string = '7d'
): string {
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

export function verifyToken(
  token: string
): {
  userId: string;
  email: string;
  type: string;
  iat: number;
  exp: number;
} | null {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'bukeng',
      audience: 'bukeng-users',
    }) as any;
  } catch (error) {
    return null;
  }
}

export function hashPin(pin: string): string {
  // Use PBKDF2 for PIN hashing (not reversible)
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(pin, salt, 100000, 64, 'sha512')
    .toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto
    .pbkdf2Sync(pin, salt, 100000, 64, 'sha512')
    .toString('hex');
  return hash === verifyHash;
}

export function generateSecureRandomCode(length: number = 6): string {
  return crypto.randomInt(100000, 999999).toString().slice(0, length);
}
