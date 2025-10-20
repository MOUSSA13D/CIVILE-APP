import { Router, Request, Response } from 'express';
import { Declaration } from '../models/Declaration.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { PAYMENT_PROVIDERS } from '../config/constants.js';
import { processStampPayment } from '../utils/paymentMock.js';
import { generateExtractHTML } from '../utils/extractGenerator.js';

const router = Router();

// Parent creates a declaration
/**
 * @openapi
 * /declarations:
 *   post:
 *     summary: Créer une déclaration (parent)
 *     tags: [Declarations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Déclaration créée
 *       401:
 *         description: Non autorisé
 */
router.post('/', requireAuth, requireRole(['parent']), async (req: Request, res: Response) => {
  const { child, mother, father, documents } = req.body || {};
  const doc = await Declaration.create({ parent: req.user!.id, child, mother, father, documents });
  res.status(201).json(doc);
});

// Parent lists own declarations
/**
 * @openapi
 * /declarations/me:
 *   get:
 *     summary: Lister mes déclarations (parent)
 *     tags: [Declarations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des déclarations
 *       401:
 *         description: Non autorisé
 */
router.get('/me', requireAuth, requireRole(['parent']), async (req: Request, res: Response) => {
  const list = await Declaration.find({ parent: req.user!.id }).sort({ createdAt: -1 });
  res.json(list);
});

// Parent can update if pending or rejected
/**
 * @openapi
 * /declarations/{id}:
 *   put:
 *     summary: Mettre à jour une déclaration (si pending/rejected)
 *     tags: [Declarations]
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
 *     responses:
 *       200:
 *         description: Déclaration mise à jour
 *       400:
 *         description: Statut incompatible
 *       404:
 *         description: Introuvable
 */
router.put('/:id', requireAuth, requireRole(['parent']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const doc = await Declaration.findOne({ _id: id, parent: req.user!.id });
  if (!doc) return res.status(404).json({ message: 'Not found' });
  if (!['pending', 'rejected'].includes(doc.status)) return res.status(400).json({ message: 'Cannot edit at this stage' });
  Object.assign(doc, req.body);
  await doc.save();
  res.json(doc);
});

// Mock payment of stamp (Wave / Orange Money)
/**
 * @openapi
 * /declarations/{id}/pay:
 *   post:
 *     summary: Payer le timbre (parent)
 *     tags: [Declarations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [WAVE, ORANGE]
 *     responses:
 *       200:
 *         description: Paiement simulé réussi
 *       400:
 *         description: Provider invalide ou déjà payé
 *       404:
 *         description: Introuvable
 */
router.post('/:id/pay', requireAuth, requireRole(['parent']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { provider } = req.body || {};
  if (!PAYMENT_PROVIDERS.includes(provider)) return res.status(400).json({ message: 'Invalid provider' });
  const doc = await Declaration.findOne({ _id: id, parent: req.user!.id });
  if (!doc) return res.status(404).json({ message: 'Not found' });
  if (doc.payment.stampPaid) return res.status(400).json({ message: 'Already paid' });
  const result = await processStampPayment(provider);
  doc.payment = { stampPaid: true, provider, transactionId: result.transactionId, paidAt: new Date() } as any;
  await doc.save();
  res.json({ success: true, transactionId: result.transactionId });
});

// Download extract (single time)
/**
 * @openapi
 * /declarations/{id}/extract:
 *   get:
 *     summary: Télécharger l'extrait (une seule fois)
 *     tags: [Declarations]
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
 *         description: HTML de l'extrait
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       400:
 *         description: Non validé / timbre non payé / déjà téléchargé
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Introuvable
 */
router.get('/:id/extract', requireAuth, requireRole(['parent']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const doc = await Declaration.findOne({ _id: id, parent: req.user!.id });
  if (!doc) return res.status(404).json({ message: 'Not found' });
  if (doc.status !== 'validated') return res.status(400).json({ message: 'Not validated yet' });
  if (!doc.payment?.stampPaid) return res.status(400).json({ message: 'Stamp not paid' });
  if (doc.extract?.downloadCount && doc.extract.downloadCount >= 1) return res.status(403).json({ message: 'Extract already downloaded' });
  if (!doc.extract?.html) {
    // generate on first download if not present
    const html = generateExtractHTML({
      child: doc.child as any,
      mother: doc.mother as any,
      father: doc.father as any,
      declarationId: doc._id.toString(),
      paidAt: doc.payment.paidAt!,
    });
    doc.extract = { html, generatedAt: new Date(), downloadedAt: new Date(), downloadCount: 1 } as any;
  } else {
    doc.extract.downloadedAt = new Date();
    doc.extract.downloadCount = (doc.extract.downloadCount || 0) + 1;
  }
  await doc.save();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(doc.extract!.html);
});

export default router;
