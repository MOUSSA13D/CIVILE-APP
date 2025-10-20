import { Router } from 'express';
import { User } from '../models/User.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signJwt } from '../utils/jwt.js';
const router = Router();
// Register for parents only
/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new parent user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *       400:
 *         description: Missing fields
 *       409:
 *         description: Email already used
 */
router.post('/register', async (req, res) => {
    const { email, password, name } = req.body || {};
    if (!email || !password || !name)
        return res.status(400).json({ message: 'Missing fields' });
    const exists = await User.findOne({ email });
    if (exists)
        return res.status(409).json({ message: 'Email already used' });
    const passwordHash = await hashPassword(password);
    const user = await User.create({ email, passwordHash, role: 'parent', name });
    const token = signJwt({ id: user._id.toString(), role: user.role, email: user.email });
    res.json({ token, user: { id: user._id, email: user.email, role: user.role, name: user.name } });
});
// Login for all roles
/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Authenticated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Missing credentials
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password)
        return res.status(400).json({ message: 'Missing credentials' });
    const user = await User.findOne({ email });
    if (!user)
        return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await comparePassword(password, user.passwordHash);
    if (!ok)
        return res.status(401).json({ message: 'Invalid credentials' });
    const token = signJwt({ id: user._id.toString(), role: user.role, email: user.email });
    res.json({ token, user: { id: user._id, email: user.email, role: user.role, name: user.name } });
});
export default router;
