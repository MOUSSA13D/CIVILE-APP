import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Declaration } from '../models/Declaration.js';

const router = Router();

// List all declarations with basic stats
/**
 * @openapi
 * /mairie:
 *   get:
 *     summary: Lister toutes les déclarations (avec stats)
 *     tags: [Mairie]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques et liste des déclarations
 *       401:
 *         description: Non autorisé
 */
router.get('/', requireAuth, requireRole(['mairie']), async (_req: Request, res: Response) => {
  const items = await Declaration.find().sort({ createdAt: -1 }).limit(200);
  const stats = {
    total: await Declaration.countDocuments(),
    pending: await Declaration.countDocuments({ status: 'pending' }),
    in_verification: await Declaration.countDocuments({ status: 'in_verification' }),
    validated: await Declaration.countDocuments({ status: 'validated' }),
    rejected: await Declaration.countDocuments({ status: 'rejected' }),
  };
  res.json({ stats, items });
});

// Send for hospital verification
/**
 * @openapi
 * /mairie/{id}/send-to-hospital:
 *   post:
 *     summary: Envoyer une déclaration à l'hôpital pour vérification
 *     tags: [Mairie]
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
 *         description: Envoyée pour vérification
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Introuvable
 */
router.post('/:id/send-to-hospital', requireAuth, requireRole(['mairie']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const doc = await Declaration.findById(id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  doc.status = 'in_verification';
  doc.verification = { ...doc.verification, sentToHospitalAt: new Date() } as any;
  await doc.save();
  res.json({ success: true });
});

// Validate declaration
/**
 * @openapi
 * /mairie/{id}/validate:
 *   post:
 *     summary: Valider une déclaration
 *     tags: [Mairie]
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
 *         description: Déclaration validée
 *       400:
 *         description: Doit être vérifiée d'abord
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Introuvable
 */
router.post('/:id/validate', requireAuth, requireRole(['mairie']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const doc = await Declaration.findById(id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  if (doc.status !== 'in_verification') return res.status(400).json({ message: 'Must be verified first' });
  doc.status = 'validated';
  await doc.save();
  res.json({ success: true });
});

// Reject with reason
/**
 * @openapi
 * /mairie/{id}/reject:
 *   post:
 *     summary: Rejeter une déclaration avec motif
 *     tags: [Mairie]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Déclaration rejetée
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Introuvable
 */
router.post('/:id/reject', requireAuth, requireRole(['mairie']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body || {};
  const doc = await Declaration.findById(id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  doc.status = 'rejected';
  doc.rejectionReason = reason || 'Non conforme';
  await doc.save();
  res.json({ success: true });
});

export default router;
