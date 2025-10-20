import { verifyJwt } from '../utils/jwt.js';
export function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token)
        return res.status(401).json({ message: 'Unauthorized' });
    const payload = verifyJwt(token);
    if (!payload)
        return res.status(401).json({ message: 'Invalid token' });
    req.user = payload;
    next();
}
export function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        next();
    };
}
