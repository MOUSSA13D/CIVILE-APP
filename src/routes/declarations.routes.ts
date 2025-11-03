import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Declaration } from '../models/Declaration.js';
import { Notification } from '../models/Notification.js';
import { requireAuth, requireRole, requireVerified } from '../middleware/auth.js';
import { PAYMENT_PROVIDERS } from '../config/constants.js';
import { processStampPayment } from '../utils/paymentMock.js';
import { generateExtractHTML } from '../utils/extractGenerator.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as pdf from 'html-pdf';
import phantom from 'phantomjs-prebuilt';
import { parseFormData } from '../middleware/parseFormData.js';

// Obtenir le chemin du répertoire actuel en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Créer les répertoires nécessaires
const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Person:
 *       type: object
 *       required: [name, nationality, birthDate]
 *       properties:
 *         name:
 *           type: string
 *           example: "Fatou MBOW"
 *         nationality:
 *           type: string
 *           example: "Sénégalaise"
 *         birthDate:
 *           type: string
 *           format: date
 *           example: "1993-07-12"
 *
 *     Child:
 *       type: object
 *       required: [firstName, lastName, birthDate, birthPlace]
 *       properties:
 *         firstName:
 *           type: string
 *           example: "ASSANE"
 *         lastName:
 *           type: string
 *           example: "NIASS"
 *         birthDate:
 *           type: string
 *           format: date
 *           example: "2025-10-15T00:00:00.000+00:00"
 *         birthPlace:
 *           type: string
 *           example: "Hôpital Principal de Dakar"
 *
 *     Declaration:
 *       type: object
 *       required: [child, mother, father, documents, status, payment, extract]
 *       properties:
 *         _id:
 *           type: string
 *           example: "68f79bceeba120db6cecff92"
 *         parent:
 *           type: string
 *           example: "68f7968ccb9c667843473ff5"
 *         child:
 *           $ref: '#/components/schemas/Child'
 *         mother:
 *           $ref: '#/components/schemas/Person'
 *         father:
 *           $ref: '#/components/schemas/Person'
 *         documents:
 *           type: array
 *           items:
 *             type: string
 *           example: ["certificat_naissance.pdf"]
 *         status:
 *           type: string
 *           enum: [pending, in_verification, validated, rejected]
 *           example: "pending"
 *         payment:
 *           type: object
 *           required: [stampPaid]
 *           properties:
 *             stampPaid:
 *               type: boolean
 *               example: false
 *         extract:
 *           type: object
 *           properties:
 *             downloadCount:
 *               type: number
 *               example: 0
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-10-21T14:42:22.392+00:00"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2025-10-21T14:42:22.392+00:00"
 *         __v:
 *           type: number
 *           example: 0
 */

/**
 * @openapi
 * tags:
 *   - name: Parent
 *     description: Routes pour les parents (création, paiement, téléchargement)
 *   - name: Mairie
 *     description: Routes pour la mairie (vérification et fabrication)
 *   - name: Hopital
 *     description: Routes pour l’hôpital (vérification certificat)
 */

//
// ---------- ROUTES PARENT ----------
//

/**
 * @openapi
 * /declarations:
 *   post:
 *     summary: Créer une déclaration avec téléversement de documents (Parent)
 *     tags: [Parent]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - child
 *               - mother
 *               - father
 *               - certificat_naissance
 *               - piece_identite_pere
 *               - piece_identite_mere
 *               - livret_famille
 *               - justificatif_domicile
 *             properties:
 *               child:
 *                 type: string
 *                 format: json
 *                 description: |
 *                   Données de l'enfant au format JSON. Exemple :
 *                   ```json
 *                   {
 *                     "firstName": "ASSANE",
 *                     "lastName": "NIASS",
 *                     "birthDate": "2025-10-15T00:00:00.000+00:00",
 *                     "birthPlace": "Hôpital Principal de Dakar"
 *                   }
 *                   ```
 *               mother:
 *                 type: string
 *                 format: json
 *                 description: |
 *                   Données de la mère au format JSON. Exemple :
 *                   ```json
 *                   {
 *                     "name": "Fatou MBOW",
 *                     "nationality": "Sénégalaise",
 *                     "birthDate": "1993-07-12"
 *                   }
 *                   ```
 *               father:
 *                 type: string
 *                 format: json
 *                 description: |
 *                   Données du père au format JSON. Exemple :
 *                   ```json
 *                   {
 *                     "name": "ALIOU NIASS",
 *                     "nationality": "Sénégalaise",
 *                     "birthDate": "1993-07-12"
 *                   }
 *                   ```
 *               certificat_naissance:
 *                 type: string
 *                 format: binary
 *                 description: Certificat de naissance (PDF, JPG, PNG, max 5MB)
 *               piece_identite_pere:
 *                 type: string
 *                 format: binary
 *                 description: Pièce d'identité du père (PDF, JPG, PNG, max 5MB)
 *               piece_identite_mere:
 *                 type: string
 *                 format: binary
 *                 description: Pièce d'identité de la mère (PDF, JPG, PNG, max 5MB)
 *               livret_famille:
 *                 type: string
 *                 format: binary
 *                 description: Livret de famille (PDF, JPG, PNG, max 5MB)
 *               justificatif_domicile:
 *                 type: string
 *                 format: binary
 *                 description: Justificatif de domicile (PDF, JPG, PNG, max 5MB)
 *     responses:
 *       201:
 *         description: Déclaration créée avec succès
 *       400:
 *         description: Données invalides ou fichiers manquants
 */
router.post('/', 
  requireAuth, 
  requireRole(['parent']), 
  requireVerified,
  parseFormData,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { child, mother, father, hospital } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      // Vérifier que tous les champs requis sont présents
      if (!child || !mother || !father || !hospital) {
        return res.status(400).json({
          success: false,
          message: 'Tous les champs sont obligatoires',
          requiredFields: ['child', 'mother', 'father', 'hospital']
        });
      }

      // Vérifier que tous les fichiers sont présents
      const requiredFiles = [
        'certificat_naissance',
        'piece_identite_pere',
        'piece_identite_mere',
        'livret_famille',
        'justificatif_domicile'
      ];
      
      const missingFiles = requiredFiles.filter(file => !files || !files[file] || files[file].length === 0);
      
      if (missingFiles.length > 0) {
        // Nettoyer les fichiers déjà téléchargés
        if (files) {
          for (const fileArray of Object.values(files)) {
            if (fileArray && fileArray[0] && fileArray[0].path && fs.existsSync(fileArray[0].path)) {
              fs.unlinkSync(fileArray[0].path);
            }
          }
        }
        
        return res.status(400).json({
          success: false,
          message: 'Tous les documents sont requis',
          missingFiles,
          requiredFiles
        });
      }

      // Vérifier que tous les fichiers sont définis et ont un chemin valide
      const certificatNaissance = files.certificat_naissance?.[0]?.path;
      const pieceIdentitePere = files.piece_identite_pere?.[0]?.path;
      const pieceIdentiteMere = files.piece_identite_mere?.[0]?.path;
      const livretFamille = files.livret_famille?.[0]?.path;
      const justificatifDomicile = files.justificatif_domicile?.[0]?.path;

      if (!certificatNaissance || !pieceIdentitePere || !pieceIdentiteMere || !livretFamille || !justificatifDomicile) {
        // Nettoyer les fichiers déjà téléchargés
        const uploadedFiles = [
          certificatNaissance,
          pieceIdentitePere,
          pieceIdentiteMere,
          livretFamille,
          justificatifDomicile
        ].filter(Boolean);

        uploadedFiles.forEach(filePath => {
          if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });

        return res.status(400).json({
          success: false,
          message: 'Erreur lors du traitement des fichiers téléchargés',
          error: 'INVALID_FILE_UPLOAD'
        });
      }

      // Préparer les chemins des fichiers
      const documents = {
        certificat_naissance: certificatNaissance,
        piece_identite_pere: pieceIdentitePere,
        piece_identite_mere: pieceIdentiteMere,
        livret_famille: livretFamille,
        justificatif_domicile: justificatifDomicile
      };

      // Validation des dates
      const childBirthDate = new Date(child.birthDate);
      const motherBirthDate = new Date(mother.birthDate);
      const fatherBirthDate = new Date(father.birthDate);

      if (isNaN(childBirthDate.getTime()) || isNaN(motherBirthDate.getTime()) || isNaN(fatherBirthDate.getTime())) {
        throw new Error('Format de date invalide');
      }

      // Validation du sexe
      if (!['M', 'F'].includes(child.sex)) {
        throw new Error('Le sexe doit être M ou F');
      }

      // Création de la déclaration
      const declarationData = {
        parent: req.user!.id,
        child: {
          firstName: child.firstName.trim(),
          lastName: child.lastName.trim(),
          birthDate: childBirthDate,
          sex: child.sex,
          birthPlace: child.birthPlace.trim(),
          birthHospital: hospital.name.trim(), // Utiliser le nom de l'hôpital du formulaire
          weightAtBirth: child.weightAtBirth ? parseInt(child.weightAtBirth) : undefined,
          heightAtBirth: child.heightAtBirth ? parseInt(child.heightAtBirth) : undefined
        },
        mother: {
            name: mother.name.trim(),
            nationality: mother.nationality.trim(),
            birthDate: motherBirthDate,
            profession: mother.profession?.trim() || '',
            phoneNumber: mother.phoneNumber?.trim() || '',
            address: {
              street: mother.address.street.trim(),
              city: mother.address.city.trim(),
              postalCode: mother.address.postalCode.trim(),
              country: (mother.address.country || 'France').trim()
            }
          },
          father: {
            name: father.name.trim(),
            nationality: father.nationality.trim(),
            birthDate: fatherBirthDate,
            profession: father.profession?.trim() || '',
            phoneNumber: father.phoneNumber?.trim() || '',
            address: {
              street: father.address.street.trim(),
              city: father.address.city.trim(),
              postalCode: father.address.postalCode.trim(),
              country: (father.address.country || 'France').trim()
            }
          },
          hospital: {
            name: hospital.name.trim(),
            phoneNumber: hospital.phoneNumber?.trim() || '',
            address: {
              street: hospital.address.street.trim(),
              city: hospital.address.city.trim(),
              postalCode: hospital.address.postalCode.trim(),
              country: (hospital.address.country || 'France').trim()
            }
          },
          documents: Object.values(documents),
          status: 'pending',
          payment: {
            stampPaid: false
          },
          verification: {
            sentToHospitalAt: null,
            hospitalVerifiedAt: null,
            hospitalRejectedAt: null
          },
          extract: {
            downloadCount: 0
          }
        };

        const doc = await Declaration.create(declarationData);

        // Envoyer une notification à la mairie
        await Notification.create({
          user: req.user!.id,
          type: 'declaration_submitted',
          message: `Nouvelle déclaration de naissance pour ${doc.child.firstName} ${doc.child.lastName}`,
          declaration: doc._id,
          isRead: false
        });

      res.status(201).json({
        success: true,
        message: 'Déclaration créée avec succès',
        data: doc
      });
    } catch (error) {
      console.error('Erreur lors de la création de la déclaration:', error);
      
      // En cas d'erreur, supprimer les fichiers téléchargés
      const uploadedFiles: string[] = [];
      
      // Utiliser req.files qui a été typé plus haut
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      // Ajouter les chemins des fichiers s'ils existent
      if (files?.certificatNaissance?.[0]?.path) uploadedFiles.push(files.certificatNaissance[0].path);
      if (files?.pieceIdentitePere?.[0]?.path) uploadedFiles.push(files.pieceIdentitePere[0].path);
      if (files?.pieceIdentiteMere?.[0]?.path) uploadedFiles.push(files.pieceIdentiteMere[0].path);
      if (files?.livretFamille?.[0]?.path) uploadedFiles.push(files.livretFamille[0].path);
      if (files?.justificatifDomicile?.[0]?.path) uploadedFiles.push(files.justificatifDomicile[0].path);

      uploadedFiles.forEach(filePath => {
        try {
          if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.error(`Erreur lors de la suppression du fichier ${filePath}:`, err);
        }
      });
      
      // Nettoyage des fichiers en cas d'erreur
      if (req.files) {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        for (const fileArray of Object.values(files)) {
          if (fileArray && fileArray[0] && fileArray[0].path) {
            try {
              if (fs.existsSync(fileArray[0].path)) {
                fs.unlinkSync(fileArray[0].path);
              }
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
              console.error('Erreur lors de la suppression du fichier:', errorMessage);
            }
          }
        }
      }
      
      // Gestion des erreurs spécifiques
      if (error instanceof Error) {
        if ('name' in error && error.name === 'ValidationError') {
          return res.status(400).json({
            success: false,
            message: 'Erreur de validation des données',
            errors: (error as any).errors
          });
        }
        
        // Erreur serveur générique avec message d'erreur
        res.status(500).json({
          success: false,
          message: 'Une erreur est survenue lors de la création de la déclaration',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      } else {
        // Erreur inconnue
        res.status(500).json({
          success: false,
          message: 'Une erreur inconnue est survenue lors de la création de la déclaration'
        });
      }
    }
  }
);

/**
 * @openapi
 * /declarations/me:
 *   get:
 *     summary: Lister mes déclarations (Parent)
 *     tags: [Parent]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des déclarations du parent
 */
// Récupérer les déclarations de l'utilisateur connecté
router.get('/me', requireAuth, requireRole(['parent']), async (req: Request, res: Response) => {
  try {
    const parentObjectId = new Types.ObjectId(req.user!.id);
    const declarations = await Declaration.find({ parent: parentObjectId })
      .select('-__v')
      .sort({ createdAt: -1 });
      
    res.json({
      success: true,
      data: declarations,
      count: declarations.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des déclarations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des déclarations',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * @openapi
 * /declarations/{id}/pay:
 *   post:
 *     summary: Payer le timbre via Wave ou Orange Money
 *     tags: [Parent]
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
 *                 enum: [wave, orange_money]
 *                 example: "wave"
 *     responses:
 *       200:
 *         description: Paiement validé
 *       400:
 *         description: Erreur paiement ou provider invalide
 */
router.post('/:id/pay', requireAuth, requireRole(['parent']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { provider } = req.body || {};
  
  // Logs de debug
  console.log('[PAY] Provider reçu:', provider);
  console.log('[PAY] Type du provider:', typeof provider);
  console.log('[PAY] Providers autorisés:', PAYMENT_PROVIDERS);
  console.log('[PAY] Provider est dans la liste?', PAYMENT_PROVIDERS.includes(provider));
  
  if (!PAYMENT_PROVIDERS.includes(provider)) {
    return res.status(400).json({ 
      message: 'Invalid provider',
      received: provider,
      expected: PAYMENT_PROVIDERS 
    });
  }
  
  const parentObjectId = new Types.ObjectId(req.user!.id);
  const doc = await Declaration.findOne({ _id: id, parent: parentObjectId });
  if (!doc) return res.status(404).json({ message: 'Not found' });
  if (doc.payment?.stampPaid) return res.status(400).json({ message: 'Already paid' });
  const result = await processStampPayment(provider);
  doc.payment = { stampPaid: true, provider, transactionId: result.transactionId, paidAt: new Date() } as any;
  await doc.save();
  res.json({ success: true, transactionId: result.transactionId });
});

/**
 * @openapi
 * /declarations/{id}/extract:
 *   get:
 *     summary: Télécharger l’extrait si validé
 *     tags: [Parent]
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
 *         description: Extrait HTML
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       400:
 *         description: Erreur statut ou paiement
 */
/**
 * @openapi
 * /declarations/{id}/extract:
 *   get:
 *     summary: Obtenir un lien pour télécharger l'extrait de déclaration validé
 *     tags: [Parent]
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
 *         description: Lien de téléchargement de l'extrait
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 downloadUrl:
 *                   type: string
 *                   example: "/downloads/extrait_naissance_dupont_2025-10-24.pdf"
 *                 message:
 *                   type: string
 *                   example: "Téléchargez votre extrait en utilisant le lien fourni"
 *                 expiresIn:
 *                   type: string
 *                   example: "5 minutes"
 *       400:
 *         description: Déclaration non validée ou timbre non payé
 *       404:
 *         description: Déclaration non trouvée
 */
router.get('/:id/extract', requireAuth, requireRole(['parent']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const parentObjectId = new Types.ObjectId(req.user!.id);
  
  try {
    const doc = await Declaration.findOne({ _id: id, parent: parentObjectId });
    if (!doc) {
      console.log('Déclaration non trouvée pour l\'utilisateur');
      return res.status(404).json({ message: 'Déclaration non trouvée' });
    }
    
    if (doc.status !== 'validated') {
      console.log('Déclaration non validée, statut actuel:', doc.status);
      return res.status(400).json({ message: 'Déclaration non validée' });
    }
    
    if (!doc.payment?.stampPaid) {
      console.log('Timbre non payé pour la déclaration');
      return res.status(400).json({ message: 'Timbre non payé' });
    }
    
    console.log('Génération du contenu HTML...');
    
    // Vérification de type pour doc._id
    if (!doc._id) {
      throw new Error('ID de déclaration manquant');
    }
    
    const declarationId = doc._id.toString();
    
    const html = generateExtractHTML({
      child: doc.child as any,
      mother: doc.mother as any,
      father: doc.father as any,
      declarationId,
      paidAt: doc.payment.paidAt!,
    });

    // Créer un nom de fichier avec le nom de l'enfant et la date
    const childName = doc.child?.lastName ? doc.child.lastName.replace(/[^a-zA-Z0-9]/g, '_') : 'extrait';
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `extrait_naissance_${childName}_${dateStr}.pdf`;
    
    console.log('Options pour le PDF');
    const options: pdf.CreateOptions = {
      format: 'A4',
      border: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      },
      type: 'pdf',
      timeout: 60000, // Augmentation du timeout à 60 secondes
      phantomPath: phantom.path
    };

    console.log('Génération du PDF en mémoire...');
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      pdf.create(html, options).toBuffer((err: Error | null, buffer: Buffer) => {
        if (err) {
          console.error('Erreur lors de la génération du PDF:', err);
          return reject(err);
        }
        console.log('PDF généré avec succès, taille:', buffer.length, 'octets');
        resolve(buffer);
      });
    });

    // Envoyer directement le fichier
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    console.log('Envoi du PDF...');
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Erreur lors de la génération de l\'extrait:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la génération de l\'extrait',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

//
// ---------- ROUTES MAIRIE ----------
//

/**
 * @openapi
 * /mairie/declarations/pending:
 *   get:
 *     summary: Voir toutes les déclarations en attente
 *     tags: [Mairie]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des déclarations à traiter
 */
router.get('/mairie/declarations/pending', requireAuth, requireRole(['mairie']), async (_req: Request, res: Response) => {
  const list = await Declaration.find({ status: 'pending' });
  res.json(list);
});

/**
 * @openapi
 * /mairie/declarations/{id}/verify:
 *   post:
 *     summary: Envoyer la demande de vérification à l’hôpital
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
 *         description: Demande envoyée à l’hôpital
 */
router.post('/mairie/declarations/:id/verify', requireAuth, requireRole(['mairie']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const doc = await Declaration.findById(id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  doc.status = 'in_verification';
  await doc.save();
  res.json({ message: 'Envoyé à l’hôpital pour vérification' });
});

/**
 * @openapi
 * /mairie/declarations/{id}/validate:
 *   post:
 *     summary: Valider la déclaration après réponse de l’hôpital
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
 *         description: Acte de naissance validé
 */
// Cette route a été déplacée vers mairie.routes.ts pour une meilleure organisation

/**
 * @openapi
 * /declarations/{id}:
 *   put:
 *     summary: Mettre à jour une déclaration existante
 *     description: Permet à un parent de mettre à jour sa déclaration avant validation
 *     tags: [Parent]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la déclaration à mettre à jour
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDeclaration'
 *     responses:
 *       200:
 *         description: Déclaration mise à jour avec succès
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
 *                   example: "Déclaration mise à jour avec succès"
 *                 data:
 *                   $ref: '#/components/schemas/Declaration'
 *       400:
 *         description: Données invalides ou déclaration déjà validée
 *       403:
 *         description: Non autorisé à modifier cette déclaration
 *       404:
 *         description: Déclaration non trouvée
 */
router.put('/:id', 
  requireAuth, 
  requireRole(['parent']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userId = req.user!.id;

      // Vérifier que la déclaration existe et appartient à l'utilisateur
      const declaration = await Declaration.findOne({ _id: id, parent: userId });
      if (!declaration) {
        return res.status(404).json({ 
          success: false,
          message: 'Déclaration non trouvée',
          error: 'NOT_FOUND'
        });
      }

      // Ne pas permettre la modification si déjà validée
      if (declaration.status !== 'pending' && declaration.status !== 'rejected') {
        return res.status(400).json({ 
          success: false,
          message: 'Impossible de modifier une déclaration déjà validée',
          error: 'VALIDATION_ALREADY_DONE'
        });
      }

      // Mettre à jour les champs modifiables
      const allowedUpdates = ['child', 'mother', 'father', 'hospital'];
      Object.keys(updates).forEach(update => {
        if (allowedUpdates.includes(update) && updates[update]) {
          // Mise à jour des sous-champs
          Object.keys(updates[update]).forEach(field => {
            if (updates[update][field] !== undefined) {
              declaration[update][field] = updates[update][field];
            }
          });
        }
      });

      // Réinitialiser le statut si la déclaration était rejetée
      if (declaration.status === 'rejected') {
        declaration.status = 'pending';
        declaration.rejectionReason = undefined;
      }

      declaration.updatedAt = new Date();
      await declaration.save();

      res.json({
        success: true,
        message: 'Déclaration mise à jour avec succès',
        data: declaration
      });

    } catch (error) {
      console.error('Erreur lors de la mise à jour de la déclaration:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erreur lors de la mise à jour de la déclaration',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
);

//
// ---------- ROUTES HÔPITAL ----------
//

/**
 * @openapi
 * /hopital/declarations:
 *   get:
 *     summary: Voir les demandes envoyées par la mairie
 *     tags: [Hopital]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des vérifications à effectuer
 */
router.get('/hopital/declarations', requireAuth, requireRole(['hopital']), async (_req: Request, res: Response) => {
  const list = await Declaration.find({ status: 'in_verification' });
  res.json(list);
});

/**
 * @openapi
 * /hopital/declarations/{id}/response:
 *   post:
 *     summary: Répondre à la mairie (certificat authentique ou non)
 *     tags: [Hopital]
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
 *               isAuthentic:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Réponse transmise à la mairie
 */
router.post('/hopital/declarations/:id/response', requireAuth, requireRole(['hopital']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isAuthentic } = req.body;
  const doc = await Declaration.findById(id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  doc.status = isAuthentic ? 'validated' : 'rejected';
  await doc.save();
  res.json({ message: isAuthentic ? 'Certificat authentique' : 'Certificat non conforme' });
});

export default router;
