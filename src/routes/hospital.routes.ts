import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Declaration } from '../models/Declaration.js';

const router = Router();

// List declarations to verify
/**
 * @openapi
 * /hopital:
 *   get:
 *     summary: Lister les déclarations à vérifier
 *     tags: [Hopital]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des déclarations en vérification
 *       401:
 *         description: Non autorisé
 */
router.get('/', requireAuth, requireRole(['hopital']), async (_req: Request, res: Response) => {
  const items = await Declaration.find({ status: 'in_verification' }).sort({ createdAt: -1 }).limit(200);
  res.json({ items });
});

// Confirm certificate
/**
 * @openapi
 * /hopital/{id}/confirm:
 *   post:
 *     summary: Confirmer le certificat de naissance
 *     tags: [Hopital]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Certificat confirmé
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Introuvable
 */
router.post('/:id/confirm', requireAuth, requireRole(['hopital']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const doc = await Declaration.findById(id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  doc.verification = { ...doc.verification, hospitalVerifiedAt: new Date() } as any;
  await doc.save();
  res.json({ success: true });
});

// Reject certificate
/**
 * @openapi
 * /hopital/{id}/reject:
 *   post:
 *     summary: Rejeter le certificat de naissance
 *     tags: [Hopital]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Certificat rejeté
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Introuvable
 */
router.post('/:id/reject', requireAuth, requireRole(['hopital']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const doc = await Declaration.findById(id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  doc.status = 'rejected';
  doc.verification = { ...doc.verification, hospitalRejectedAt: new Date() } as any;
  await doc.save();
  res.json({ success: true });
});

export default router;
