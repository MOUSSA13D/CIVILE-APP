import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../utils/jwt.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  const payload = verifyJwt<{ id: string; role: 'parent' | 'mairie' | 'hopital'; email: string }>(token);
  if (!payload) return res.status(401).json({ message: 'Invalid token' });
  req.user = payload;
  next();
}

export function requireRole(roles: Array<'parent' | 'mairie' | 'hopital'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}
