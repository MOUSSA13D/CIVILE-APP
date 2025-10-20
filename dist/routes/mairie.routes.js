import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Declaration } from '../models/Declaration.js';
const router = Router();
// List all declarations with basic stats
router.get('/', requireAuth, requireRole(['mairie']), async (_req, res) => {
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
router.post('/:id/send-to-hospital', requireAuth, requireRole(['mairie']), async (req, res) => {
    const { id } = req.params;
    const doc = await Declaration.findById(id);
    if (!doc)
        return res.status(404).json({ message: 'Not found' });
    doc.status = 'in_verification';
    doc.verification = { ...doc.verification, sentToHospitalAt: new Date() };
    await doc.save();
    res.json({ success: true });
});
// Validate declaration
router.post('/:id/validate', requireAuth, requireRole(['mairie']), async (req, res) => {
    const { id } = req.params;
    const doc = await Declaration.findById(id);
    if (!doc)
        return res.status(404).json({ message: 'Not found' });
    if (doc.status !== 'in_verification')
        return res.status(400).json({ message: 'Must be verified first' });
    doc.status = 'validated';
    await doc.save();
    res.json({ success: true });
});
// Reject with reason
router.post('/:id/reject', requireAuth, requireRole(['mairie']), async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body || {};
    const doc = await Declaration.findById(id);
    if (!doc)
        return res.status(404).json({ message: 'Not found' });
    doc.status = 'rejected';
    doc.rejectionReason = reason || 'Non conforme';
    await doc.save();
    res.json({ success: true });
});
export default router;
