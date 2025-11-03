import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

interface JwtPayload {
  [key: string]: any;
}

// Type assertion pour le secret JWT
const JWT_SECRET: jwt.Secret = env.jwtSecret as jwt.Secret;

export function signJwt(
  payload: JwtPayload,
  expiresIn: string | number = '7d'
): string {
  return jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn } as jwt.SignOptions
  );
}

export function verifyJwt<T = JwtPayload>(token: string): T | null {
  try {
    return jwt.verify(token, JWT_SECRET) as unknown as T;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}
