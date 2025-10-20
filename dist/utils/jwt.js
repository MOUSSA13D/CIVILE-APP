import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
export function signJwt(payload, expiresIn = '7d') {
    return jwt.sign(payload, env.jwtSecret, { expiresIn });
}
export function verifyJwt(token) {
    try {
        return jwt.verify(token, env.jwtSecret);
    }
    catch {
        return null;
    }
}
