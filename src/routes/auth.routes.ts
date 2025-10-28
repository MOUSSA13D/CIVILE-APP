import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signJwt } from '../utils/jwt.js';
import { 
  generateVerificationCode, 
  getVerificationCodeExpiry, 
  sendVerificationEmail, 
  sendVerificationSMS 
} from '../utils/verification.js';

const router = Router();

// Register for parents only
/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Inscription d'un parent
 *     description: Crée un compte parent et envoie un code de vérification par email/SMS. Le compte doit être vérifié avant de pouvoir se connecter.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName, phone, address]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "parent@example.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "password123"
 *               firstName:
 *                 type: string
 *                 example: "Fatou"
 *               lastName:
 *                 type: string
 *                 example: "Diallo"
 *               phone:
 *                 type: string
 *                 example: "+221771234567"
 *               address:
 *                 type: string
 *                 example: "Dakar, Sénégal"
 *     responses:
 *       200:
 *         description: Inscription réussie
 *       400:
 *         description: Champs manquants
 *       409:
 *         description: Email déjà utilisé
 */
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, phone, address } = req.body || {};
  
  // Validation des champs requis
  if (!email || !password || !firstName || !lastName || !phone || !address) {
    return res.status(400).json({ message: 'Missing fields' });
  }
  
  // Vérifier si l'email existe déjà
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: 'Email already used' });
  
  // Hasher le mot de passe
  const passwordHash = await hashPassword(password);
  
  // Créer le nom complet pour compatibilité
  const name = `${firstName} ${lastName}`;
  
  // Générer le code de vérification
  const verificationCode = generateVerificationCode();
  const verificationCodeExpires = getVerificationCodeExpiry();
  
  // Créer l'utilisateur (non vérifié)
  const user = await User.create({ 
    email, 
    passwordHash, 
    role: 'parent', 
    name,
    firstName,
    lastName,
    phone,
    address,
    isVerified: false,
    verificationCode,
    verificationCodeExpires
  });
  
  // Envoyer le code par email ET SMS
  try {
    await sendVerificationEmail(email, name, verificationCode);
    await sendVerificationSMS(phone, verificationCode);
  } catch (error) {
    console.error('[REGISTER] Erreur envoi code:', error);
    // On continue même si l'envoi échoue (en développement)
  }
  
  // Générer le token JWT (mais l'utilisateur doit quand même vérifier son compte)
  const token = signJwt({ id: user._id.toString(), role: user.role, email: user.email });
  
  // Retourner la réponse
  res.json({ 
    message: 'Inscription réussie. Veuillez vérifier votre compte avec le code reçu par email/SMS.',
    token, 
    user: { 
      id: user._id, 
      email: user.email, 
      role: user.role, 
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      address: user.address,
      isVerified: user.isVerified
    } 
  });
});

// Login for all roles
/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Connexion (tous rôles)
 *     description: Connexion avec email ou numéro de téléphone
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, password]
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email ou numéro de téléphone
 *                 example: "parent@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Authentification réussie
 *       400:
 *         description: Identifiants manquants
 *       401:
 *         description: Identifiants invalides
 *       403:
 *         description: Compte parent non vérifié
 */
router.post('/login', async (req: Request, res: Response) => {
  const { identifier, password } = req.body || {};
  
  // Validation des champs
  if (!identifier || !password) {
    return res.status(400).json({ message: 'Missing credentials' });
  }
  
  // Chercher l'utilisateur par email OU téléphone
  const user = await User.findOne({
    $or: [
      { email: identifier },
      { phone: identifier }
    ]
  });
  
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  
  // Vérifier le mot de passe
  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  
  // ⚠️ VÉRIFICATION DU COMPTE - Bloquer la connexion si non vérifié
  // Exception : les agents (mairie, hopital) n'ont pas besoin de vérification
  if (user.role === 'parent' && !user.isVerified) {
    return res.status(403).json({ 
      message: 'Compte non vérifié. Veuillez vérifier votre compte avec le code reçu par email/SMS avant de vous connecter.',
      isVerified: false,
      email: user.email
    });
  }
  
  // Générer le token JWT
  const token = signJwt({ id: user._id.toString(), role: user.role, email: user.email });
  
  // Retourner la réponse
  res.json({ 
    token, 
    user: { 
      id: user._id, 
      email: user.email, 
      role: user.role, 
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      address: user.address,
      isVerified: user.isVerified
    } 
  });
});

// Verify account with code
/**
 * @openapi
 * /auth/verify:
 *   post:
 *     summary: Vérifier le compte avec le code reçu
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "parent@example.com"
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Compte vérifié avec succès
 *       400:
 *         description: Code invalide ou expiré
 *       404:
 *         description: Utilisateur non trouvé
 */
router.post('/verify', async (req: Request, res: Response) => {
  const { email, code } = req.body || {};
  
  if (!email || !code) {
    return res.status(400).json({ message: 'Email et code requis' });
  }
  
  // Chercher l'utilisateur
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: 'Utilisateur non trouvé' });
  }
  
  // Vérifier si déjà vérifié
  if (user.isVerified) {
    return res.status(400).json({ message: 'Compte déjà vérifié' });
  }
  
  // Vérifier le code
  if (user.verificationCode !== code) {
    return res.status(400).json({ message: 'Code de vérification invalide' });
  }
  
  // Vérifier si le code a expiré
  if (!user.verificationCodeExpires || user.verificationCodeExpires < new Date()) {
    return res.status(400).json({ message: 'Code de vérification expiré. Demandez un nouveau code.' });
  }
  
  // Marquer le compte comme vérifié
  user.isVerified = true;
  user.verificationCode = undefined;
  user.verificationCodeExpires = undefined;
  await user.save();
  
  res.json({ 
    message: 'Compte vérifié avec succès',
    user: {
      id: user._id,
      email: user.email,
      isVerified: user.isVerified
    }
  });
});

// Resend verification code
/**
 * @openapi
 * /auth/resend-code:
 *   post:
 *     summary: Renvoyer un nouveau code de vérification
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "parent@example.com"
 *     responses:
 *       200:
 *         description: Nouveau code envoyé
 *       400:
 *         description: Compte déjà vérifié
 *       404:
 *         description: Utilisateur non trouvé
 */
router.post('/resend-code', async (req: Request, res: Response) => {
  const { email } = req.body || {};
  
  if (!email) {
    return res.status(400).json({ message: 'Email requis' });
  }
  
  // Chercher l'utilisateur
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: 'Utilisateur non trouvé' });
  }
  
  // Vérifier si déjà vérifié
  if (user.isVerified) {
    return res.status(400).json({ message: 'Compte déjà vérifié' });
  }
  
  // Générer un nouveau code
  const verificationCode = generateVerificationCode();
  const verificationCodeExpires = getVerificationCodeExpiry();
  
  user.verificationCode = verificationCode;
  user.verificationCodeExpires = verificationCodeExpires;
  await user.save();
  
  // Envoyer le nouveau code
  try {
    await sendVerificationEmail(user.email, user.name, verificationCode);
    await sendVerificationSMS(user.phone, verificationCode);
  } catch (error) {
    console.error('[RESEND] Erreur envoi code:', error);
  }
  
  res.json({ 
    message: 'Nouveau code de vérification envoyé par email et SMS'
  });
});

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Déconnexion de l'utilisateur
 *     description: Invalide le token JWT et déconnecte l'utilisateur
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Déconnexion réussie
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
 *                   example: "Déconnexion réussie"
 *       401:
 *         description: Non authentifié
 */
router.post('/logout', (req: Request, res: Response) => {
  // Le client doit supprimer le token côté navigateur
  res.json({ 
    success: true, 
    message: 'Déconnexion réussie' 
  });
});

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Récupérer les informations du profil
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Non authentifié
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    console.log('[AUTH] Récupération du profil utilisateur ID:', req.user!.id);
    
    const user = await User.findById(req.user!.id)
      .select('-passwordHash -verificationCode -verificationCodeExpires -__v')
      .lean()
      .exec();
      
    if (!user) {
      console.error('[AUTH] Utilisateur non trouvé pour ID:', req.user!.id);
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }
    
    // Formater la réponse de manière cohérente
    const userData = {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      address: user.address,
      isVerified: user.isVerified,
      avatarUrl: user.avatarUrl
    };
    
    // Ajouter l'URL complète de l'avatar si présent
    if (userData.avatarUrl && !userData.avatarUrl.startsWith('http')) {
      const baseUrl = process.env.BACKEND_URL || 'http://localhost:4000';
      userData.avatarUrl = `${baseUrl}${userData.avatarUrl}`;
    }
    
    console.log('[AUTH] Profil récupéré avec succès pour:', user.email);
    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération du profil',
      error: process.env.NODE_ENV === 'development' 
        ? (error as Error).message 
        : undefined
    });
  }
});

/**
 * @openapi
 * /auth/me:
 *   put:
 *     summary: Mettre à jour le profil de l'utilisateur
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               currentPassword:
 *                 type: string
 *                 description: Requis uniquement pour changer le mot de passe
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profil mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Données invalides ou mot de passe incorrect
 *       401:
 *         description: Non autorisé
 */
router.put('/me', requireAuth, async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);
  
  console.log(`[${requestId}] [AUTH] Début de la mise à jour du profil pour l'utilisateur ID:`, req.user!.id);
  console.log(`[${requestId}] [AUTH] Données reçues:`, JSON.stringify(req.body, null, 2));
  
  try {
    const { currentPassword, newPassword, ...updateData } = req.body;
    const userId = req.user!.id;

    // Valider que des données sont fournies
    if (Object.keys(updateData).length === 0 && !newPassword) {
      console.log(`[${requestId}] [AUTH] Aucune donnée fournie pour la mise à jour`);
      return res.status(400).json({
        success: false,
        message: 'Aucune donnée fournie pour la mise à jour',
        requestId
      });
    }

    // Récupérer l'utilisateur avec les champs nécessaires
    console.log(`[${requestId}] [AUTH] Recherche de l'utilisateur avec ID:`, userId);
    const user = await User.findById(userId);

    if (!user) {
      console.error(`[${requestId}] [AUTH] Utilisateur non trouvé pour la mise à jour ID:`, userId);
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé',
        requestId
      });
    }
    
    console.log(`[${requestId}] [AUTH] Utilisateur trouvé:`, {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    });

    // Mettre à jour les champs de base
    const allowedFields = ['firstName', 'lastName', 'phone', 'address', 'avatarUrl'];
    let updatedFields: string[] = [];
    
    // Vérifier et mettre à jour chaque champ autorisé
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        const newValue = typeof updateData[field] === 'string' 
          ? updateData[field].trim() 
          : updateData[field];
          
        // Vérifier si la valeur a changé
        if (JSON.stringify(user[field]) !== JSON.stringify(newValue)) {
          console.log(`[${requestId}] [AUTH] Mise à jour du champ '${field}':`, {
            ancienneValeur: user[field],
            nouvelleValeur: newValue
          });
          user[field] = newValue;
          updatedFields.push(field);
        }
      }
    }

    // Gestion du changement de mot de passe
    if (newPassword) {
      console.log(`[${requestId}] [AUTH] Tentative de changement de mot de passe`);
      
      if (!currentPassword) {
        const errorMsg = 'Le mot de passe actuel est requis pour modifier le mot de passe';
        console.error(`[${requestId}] [AUTH] ${errorMsg}`);
        return res.status(400).json({ 
          success: false,
          message: errorMsg,
          requestId
        });
      }
      
      // Vérifier que le nouveau mot de passe est différent de l'ancien
      if (newPassword === currentPassword) {
        const errorMsg = 'Le nouveau mot de passe doit être différent de l\'ancien';
        console.error(`[${requestId}] [AUTH] ${errorMsg}`);
        return res.status(400).json({
          success: false,
          message: errorMsg,
          requestId
        });
      }
      
      // Vérifier la force du nouveau mot de passe
      if (newPassword.length < 8) {
        const errorMsg = 'Le mot de passe doit contenir au moins 8 caractères';
        console.error(`[${requestId}] [AUTH] ${errorMsg}`);
        return res.status(400).json({
          success: false,
          message: errorMsg,
          requestId
        });
      }
      
      // Vérifier le mot de passe actuel
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        const errorMsg = 'Le mot de passe actuel est incorrect';
        console.error(`[${requestId}] [AUTH] ${errorMsg}`);
        return res.status(400).json({ 
          success: false,
          message: errorMsg,
          requestId
        });
      }

      // Mettre à jour le mot de passe
      user.passwordHash = await hashPassword(newPassword);
      updatedFields.push('password');
      console.log(`[${requestId}] [AUTH] Mot de passe mis à jour avec succès`);
    }

    // Vérifier s'il y a des modifications à sauvegarder
    if (updatedFields.length === 0) {
      const message = 'Aucune modification détectée. Veuillez fournir au moins un champ à mettre à jour.';
      console.log(`[${requestId}] [AUTH] ${message}`);
      
      const userData = await formatUserResponse(user);
      console.log(`[${requestId}] [AUTH] Données actuelles de l'utilisateur:`, JSON.stringify(userData, null, 2));
      
      return res.status(400).json({
        success: false,
        message,
        requestId,
        data: userData
      });
    }

    try {
      // Mettre à jour la date de modification
      user.updatedAt = new Date();
      
      // Sauvegarder les modifications
      console.log(`[${requestId}] [AUTH] Sauvegarde des modifications...`);
      await user.save();
      
      console.log(`[${requestId}] [AUTH] Profil mis à jour avec succès. Champs modifiés:`, updatedFields);
      
      // Formater la réponse
      const responseData = await formatUserResponse(user);
      
      // Calculer le temps de traitement
      const processingTime = Date.now() - startTime;
      
      console.log(`[${requestId}] [AUTH] Réponse envoyée en ${processingTime}ms`);
      
      res.json({ 
        success: true, 
        message: 'Profil mis à jour avec succès',
        requestId,
        updatedFields,
        data: responseData
      });
      
    } catch (saveError) {
      console.error(`[${requestId}] [AUTH] Erreur lors de la sauvegarde:`, saveError);
      throw saveError;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error(`[${requestId}] [AUTH] Erreur lors de la mise à jour du profil:`, error);
    
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la mise à jour du profil',
      requestId,
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

// Fonction utilitaire pour formater la réponse utilisateur
async function formatUserResponse(user: any) {
  if (!user) {
    console.error('[AUTH] formatUserResponse: Aucun utilisateur fourni');
    return null;
  }

  try {
    const userObj = user.toObject ? user.toObject() : user;
    
    // Créer l'objet de réponse avec tous les champs nécessaires
    const response: any = {
      id: userObj._id?.toString() || userObj.id?.toString(),
      email: userObj.email || '',
      role: userObj.role || 'user',
      firstName: userObj.firstName || '',
      lastName: userObj.lastName || '',
      phone: userObj.phone || '',
      address: userObj.address || '',
      isVerified: Boolean(userObj.isVerified),
      avatarUrl: userObj.avatarUrl || null,
      createdAt: userObj.createdAt,
      updatedAt: userObj.updatedAt
    };
    
    // Ajouter l'URL complète de l'avatar si présent
    if (response.avatarUrl && !response.avatarUrl.startsWith('http')) {
      const baseUrl = process.env.BACKEND_URL || 'http://localhost:4000';
      response.avatarUrl = response.avatarUrl.startsWith('/') 
        ? `${baseUrl}${response.avatarUrl}`
        : `${baseUrl}/${response.avatarUrl}`;
    }
    
    console.log('[AUTH] formatUserResponse: Réponse formatée:', JSON.stringify(response, null, 2));
    return response;
  } catch (error) {
    console.error('[AUTH] Erreur lors du formatage de la réponse utilisateur:', error);
    console.error('[AUTH] Données utilisateur brutes:', JSON.stringify(user, null, 2));
    throw error;
  }
}

export default router;
