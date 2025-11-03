import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
// Type assertion pour le secret JWT
const JWT_SECRET = env.jwtSecret;
export function signJwt(payload, expiresIn = '7d') {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
}
export function verifyJwt(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    }
    catch (error) {
        console.error('JWT verification failed:', error);
        return null;
    }
}
//# sourceMappingURL=jwt.js.map