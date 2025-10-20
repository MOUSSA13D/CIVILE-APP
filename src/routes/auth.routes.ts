import { Router, Request, Response } from 'express';
import { User } from '../models/User.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signJwt } from '../utils/jwt.js';

const router = Router();

// Register for parents only
/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Inscription d'un parent
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
 *         description: Inscription réussie
 *       400:
 *         description: Champs manquants
 *       409:
 *         description: Email déjà utilisé
 */
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) return res.status(400).json({ message: 'Missing fields' });
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: 'Email already used' });
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
 *     summary: Connexion (tous rôles)
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
 *         description: Authentification réussie
 *       400:
 *         description: Identifiants manquants
 *       401:
 *         description: Identifiants invalides
 */
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Missing credentials' });
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  const token = signJwt({ id: user._id.toString(), role: user.role, email: user.email });
  res.json({ token, user: { id: user._id, email: user.email, role: user.role, name: user.name } });
});

export default router;
