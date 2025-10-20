import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Declaration } from '../models/Declaration.js';
const router = Router();
// List declarations to verify
router.get('/', requireAuth, requireRole(['hopital']), async (_req, res) => {
    const items = await Declaration.find({ status: 'in_verification' }).sort({ createdAt: -1 }).limit(200);
    res.json({ items });
});
// Confirm certificate
router.post('/:id/confirm', requireAuth, requireRole(['hopital']), async (req, res) => {
    const { id } = req.params;
    const doc = await Declaration.findById(id);
    if (!doc)
        return res.status(404).json({ message: 'Not found' });
    doc.verification = { ...doc.verification, hospitalVerifiedAt: new Date() };
    await doc.save();
    res.json({ success: true });
});
// Reject certificate
router.post('/:id/reject', requireAuth, requireRole(['hopital']), async (req, res) => {
    const { id } = req.params;
    const doc = await Declaration.findById(id);
    if (!doc)
        return res.status(404).json({ message: 'Not found' });
    doc.status = 'rejected';
    doc.verification = { ...doc.verification, hospitalRejectedAt: new Date() };
    await doc.save();
    res.json({ success: true });
});
export default router;
