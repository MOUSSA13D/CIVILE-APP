import { Router } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Declaration } from '../models/Declaration.js';
import { Notification } from '../models/Notification.js';
const router = Router();
// Déplacer la déclaration du middleware avant son utilisation
const validateDeclarationId = async (req, res, next) => {
    const { id } = req.params;
    if (!id || typeof id !== 'string' || !Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de déclaration invalide',
            error: 'INVALID_ID'
        });
    }
    try {
        const declaration = await Declaration.findById(id);
        if (!declaration) {
            return res.status(404).json({
                success: false,
                message: 'Déclaration non trouvée',
                error: 'NOT_FOUND'
            });
        }
        // Ajouter la déclaration à l'objet de requête pour une utilisation ultérieure
        req.declaration = declaration;
        next();
    }
    catch (error) {
        console.error('Erreur lors de la recherche de la déclaration:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: 'SERVER_ERROR'
        });
    }
};
/**
 * @openapi
 * /mairie/declarations/{id}/verify:
 *   post:
 *     summary: Vérifier une déclaration de naissance
 *     description: Permet à un agent de mairie de vérifier une déclaration
 *     tags: [Mairie]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la déclaration à vérifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isValid
 *             properties:
 *               isValid:
 *                 type: boolean
 *                 description: Indique si la déclaration est valide
 *               comment:
 *                 type: string
 *                 description: Commentaire optionnel
 *     responses:
 *       200:
 *         description: Déclaration vérifiée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Declaration'
 *       400:
 *         description: Requête invalide ou ID invalide
 *       401:
 *         description: Non autorisé - Token manquant ou invalide
 *       404:
 *         description: Déclaration non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.post('/declarations/:id/verify', requireAuth, requireRole(['mairie']), validateDeclarationId, async (req, res) => {
    try {
        const { id } = req.params;
        const { isValid, comment } = req.body;
        const declaration = req.declaration;
        // Vérification des documents obligatoires
        const requiredDocs = ['certificat_naissance', 'piece_identite_pere', 'piece_identite_mere'];
        const missingDocs = requiredDocs.filter(doc => !declaration.documents?.some((d) => d.includes(doc)));
        if (missingDocs.length > 0) {
            const errorMsg = `Documents manquants: ${missingDocs.join(', ')}`;
            declaration.status = 'rejected';
            declaration.rejectionReason = comment || errorMsg;
            await declaration.save();
            // Notification de rejet
            await Notification.create({
                user: declaration.parent,
                type: 'declaration_rejected',
                message: `Votre déclaration a été rejetée: ${declaration.rejectionReason}`,
                declaration: declaration._id
            });
            return res.status(400).json({
                success: false,
                message: 'Documents manquants',
                missingDocuments: missingDocs,
                data: declaration
            });
        }
        // Si la déclaration est valide
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Non autorisé - Utilisateur non authentifié'
            });
        }
        declaration.status = 'validated';
        declaration.verifiedBy = req.user.id;
        declaration.verifiedAt = new Date();
        declaration.verificationNotes = comment || 'Déclaration validée par la mairie';
        // Si précédemment rejetée, on nettoie le motif de rejet
        if (declaration.rejectionReason) {
            declaration.rejectionReason = undefined;
        }
        await declaration.save();
        // Notification de validation
        await Notification.create({
            user: declaration.parent,
            type: 'declaration_verified',
            message: 'Votre déclaration a été vérifiée et est en attente de validation par l\'hôpital',
            declaration: declaration._id
        });
        res.json({
            success: true,
            message: 'Déclaration vérifiée avec succès',
            data: declaration
        });
    }
    catch (error) {
        console.error('Erreur lors de la vérification de la déclaration:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la vérification de la déclaration',
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});
router.get('/declarations/pending', requireAuth, requireRole(['mairie']), async (_req, res) => {
    try {
        const declarations = await Declaration.find({ status: 'pending' })
            .sort({ createdAt: -1 })
            .populate('parent', 'name email phone');
        res.json({
            success: true,
            data: declarations,
            count: declarations.length
        });
    }
    catch (error) {
        console.error('Erreur lors de la récupération des déclarations en attente:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des déclarations',
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});
/**
 * @openapi
 * /mairie/declarations/{id}/validate:
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
 *         description: Déclaration validée avec succès
 *       400:
 *         description: ID invalide ou déclaration déjà traitée
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Déclaration non trouvée
 */
router.post('/declarations/:id/validate', requireAuth, requireRole(['mairie']), async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID de déclaration invalide',
                error: 'INVALID_ID'
            });
        }
        const declaration = await Declaration.findById(new Types.ObjectId(id));
        if (!declaration) {
            return res.status(404).json({
                success: false,
                message: 'Déclaration non trouvée',
                error: 'NOT_FOUND'
            });
        }
        if (declaration.status !== 'pending') {
            return res.status(400).json({
                message: 'Cette déclaration a déjà été traitée',
                currentStatus: declaration.status
            });
        }
        declaration.status = 'validated';
        declaration.validatedAt = new Date();
        await declaration.save();
        res.json({
            success: true,
            message: 'Déclaration validée avec succès',
            declaration
        });
    }
    catch (error) {
        console.error('Erreur lors de la validation de la déclaration:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la validation' });
    }
});
/**
 * @openapi
 * /mairie/declarations/{id}/send-to-hospital:
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
 *         description: Envoyée pour vérification à l'hôpital
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 declaration:
 *                   $ref: '#/components/schemas/Declaration'
 *       400:
 *         description: ID invalide ou déclaration déjà traitée
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Déclaration non trouvée
 */
router.post('/declarations/:id/send-to-hospital', requireAuth, requireRole(['mairie']), async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID de déclaration invalide',
                error: 'INVALID_ID'
            });
        }
        console.log(`Recherche de la déclaration avec l'ID: ${id}`);
        const declaration = await Declaration.findById(new Types.ObjectId(id));
        if (!declaration) {
            console.log(`Déclaration non trouvée pour l'ID: ${id}`);
            return res.status(404).json({
                success: false,
                message: 'Déclaration non trouvée',
                error: 'NOT_FOUND'
            });
        }
        console.log(`Statut actuel de la déclaration: ${declaration.status}`);
        if (declaration.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Cette déclaration a déjà été traitée',
                currentStatus: declaration.status,
                error: 'ALREADY_PROCESSED'
            });
        }
        declaration.status = 'in_verification';
        declaration.sentToHospitalAt = new Date();
        await declaration.save();
        console.log(`Déclaration ${id} marquée comme 'in_verification'`);
        res.json({
            success: true,
            message: 'Déclaration envoyée à l\'hôpital pour vérification',
            declaration: {
                id: declaration._id,
                status: declaration.status,
                sentToHospitalAt: declaration.sentToHospitalAt
            }
        });
    }
    catch (error) {
        console.error('Erreur lors de l\'envoi à l\'hôpital:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de l\'envoi à l\'hôpital',
            error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
        });
    }
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
//# sourceMappingURL=mairie.routes.js.map