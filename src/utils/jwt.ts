import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signJwt(payload: object, expiresIn: string | number = '7d') {
  return jwt.sign(payload as any, env.jwtSecret, { expiresIn });
}

export function verifyJwt<T = any>(token: string): T | null {
  try {
    return jwt.verify(token, env.jwtSecret) as T;
  } catch {
    return null;
  }
}
