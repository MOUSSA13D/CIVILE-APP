import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../utils/jwt.js';
import { User } from '../models/User.js';

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

/**
 * Middleware pour vérifier que le compte est vérifié
 * À utiliser après requireAuth
 */
export function requireVerified(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Vérifier dans la base de données si le compte est vérifié
  User.findById(req.user.id).then(user => {
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (!user.isVerified) {
      return res.status(403).json({ 
        message: 'Compte non vérifié. Veuillez vérifier votre compte avec le code reçu par email/SMS.',
        isVerified: false
      });
    }
    
    next();
  }).catch(error => {
    console.error('[requireVerified] Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  });
}
