import { Router } from 'express';
import { Declaration } from '../models/Declaration.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { PAYMENT_PROVIDERS } from '../config/constants.js';
import { processStampPayment } from '../utils/paymentMock.js';
import { generateExtractHTML } from '../utils/extractGenerator.js';
const router = Router();
// Parent creates a declaration
router.post('/', requireAuth, requireRole(['parent']), async (req, res) => {
    const { child, mother, father, documents } = req.body || {};
    const doc = await Declaration.create({ parent: req.user.id, child, mother, father, documents });
    res.status(201).json(doc);
});
// Parent lists own declarations
router.get('/me', requireAuth, requireRole(['parent']), async (req, res) => {
    const list = await Declaration.find({ parent: req.user.id }).sort({ createdAt: -1 });
    res.json(list);
});
// Parent can update if pending or rejected
router.put('/:id', requireAuth, requireRole(['parent']), async (req, res) => {
    const { id } = req.params;
    const doc = await Declaration.findOne({ _id: id, parent: req.user.id });
    if (!doc)
        return res.status(404).json({ message: 'Not found' });
    if (!['pending', 'rejected'].includes(doc.status))
        return res.status(400).json({ message: 'Cannot edit at this stage' });
    Object.assign(doc, req.body);
    await doc.save();
    res.json(doc);
});
// Mock payment of stamp (Wave / Orange Money)
router.post('/:id/pay', requireAuth, requireRole(['parent']), async (req, res) => {
    const { id } = req.params;
    const { provider } = req.body || {};
    if (!PAYMENT_PROVIDERS.includes(provider))
        return res.status(400).json({ message: 'Invalid provider' });
    const doc = await Declaration.findOne({ _id: id, parent: req.user.id });
    if (!doc)
        return res.status(404).json({ message: 'Not found' });
    if (doc.payment.stampPaid)
        return res.status(400).json({ message: 'Already paid' });
    const result = await processStampPayment(provider);
    doc.payment = { stampPaid: true, provider, transactionId: result.transactionId, paidAt: new Date() };
    await doc.save();
    res.json({ success: true, transactionId: result.transactionId });
});
// Download extract (single time)
router.get('/:id/extract', requireAuth, requireRole(['parent']), async (req, res) => {
    const { id } = req.params;
    const doc = await Declaration.findOne({ _id: id, parent: req.user.id });
    if (!doc)
        return res.status(404).json({ message: 'Not found' });
    if (doc.status !== 'validated')
        return res.status(400).json({ message: 'Not validated yet' });
    if (!doc.payment?.stampPaid)
        return res.status(400).json({ message: 'Stamp not paid' });
    if (doc.extract?.downloadCount && doc.extract.downloadCount >= 1)
        return res.status(403).json({ message: 'Extract already downloaded' });
    if (!doc.extract?.html) {
        // generate on first download if not present
        const html = generateExtractHTML({
            child: doc.child,
            mother: doc.mother,
            father: doc.father,
            declarationId: doc._id.toString(),
            paidAt: doc.payment.paidAt,
        });
        doc.extract = { html, generatedAt: new Date(), downloadedAt: new Date(), downloadCount: 1 };
    }
    else {
        doc.extract.downloadedAt = new Date();
        doc.extract.downloadCount = (doc.extract.downloadCount || 0) + 1;
    }
    await doc.save();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(doc.extract.html);
});
export default router;
