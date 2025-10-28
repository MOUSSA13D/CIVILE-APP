import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Créer les répertoires nécessaires
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuration de multer pour le stockage des fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// Filtre pour n'accepter que certains types de fichiers
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé. Seuls les fichiers PDF, JPG, JPEG et PNG sont acceptés.'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 3 // Maximum 3 fichiers
  }
});

// Middleware pour parser les champs JSON
export const parseFormData = (req: Request, res: Response, next: NextFunction) => {
  const fields = [
    { name: 'child', maxCount: 1 },
    { name: 'mother', maxCount: 1 },
    { name: 'father', maxCount: 1 },
    { name: 'hospital', maxCount: 1 },
    { name: 'certificat_naissance', maxCount: 1 },
    { name: 'piece_identite_pere', maxCount: 1 },
    { name: 'piece_identite_mere', maxCount: 1 },
    { name: 'livret_famille', maxCount: 1 },
    { name: 'justificatif_domicile', maxCount: 1 }
  ];

  upload.fields(fields)(req as any, res as any, async (err: any) => {
    if (err) {
      // Nettoyer les fichiers téléchargés en cas d'erreur
      if (req.files) {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        for (const fileArray of Object.values(files)) {
          for (const file of fileArray) {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          }
        }
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Erreur lors du téléchargement des fichiers'
      });
    }

    try {
      // Fonction pour valider une adresse
      const validateAddress = (address: any, fieldName: string) => {
        if (!address) {
          return `L'adresse (${fieldName}) est requise`;
        }
        
        const requiredFields = ['street', 'city', 'postalCode'];
        const missingFields = requiredFields.filter(field => !address[field]);
        
        if (missingFields.length > 0) {
          return `Champs manquants dans l'adresse (${fieldName}): ${missingFields.join(', ')}`;
        }
        
        return null;
      };

      // Fonction pour valider une personne (père/mère)
      const validatePerson = (person: any, role: 'mother' | 'father') => {
        if (!person) {
          return `Les informations du ${role === 'mother' ? 'parent' : 'père'} sont requises`;
        }
        
        const requiredFields = ['name', 'nationality', 'birthDate', 'address'];
        const missingFields = requiredFields.filter(field => !person[field]);
        
        if (missingFields.length > 0) {
          return `Champs manquants pour le ${role === 'mother' ? 'parent' : 'père'}: ${missingFields.join(', ')}`;
        }
        
        const addressError = validateAddress(person.address, `${role} address`);
        if (addressError) return addressError;
        
        if (isNaN(Date.parse(person.birthDate))) {
          return `Format de date de naissance invalide pour le ${role === 'mother' ? 'parent' : 'père'}`;
        }
        
        return null;
      };

      // Parser et valider les champs JSON
      const jsonFields = [
        { name: 'child', required: true },
        { name: 'mother', required: true },
        { name: 'father', required: true },
        { name: 'hospital', required: true }
      ];
      
      for (const { name: field, required } of jsonFields) {
        // Vérifier si le champ est manquant mais requis
        if ((!req.body[field] || (typeof req.body[field] === 'string' && req.body[field].trim() === '')) && required) {
          return res.status(400).json({
            success: false,
            message: `Le champ ${field} est requis`
          });
        }
        
        // Parser le champ s'il existe et est une chaîne
        if (req.body[field] && typeof req.body[field] === 'string') {
          try {
            const parsedValue = JSON.parse(req.body[field]);
            
            // Validation spécifique pour chaque type de champ
            if (field === 'child') {
              const requiredFields = [
                'firstName', 'lastName', 'birthDate', 
                'sex', 'birthPlace', 'birthHospital'
              ];
              
              const missingFields = requiredFields.filter(field => !(field in parsedValue));
              
              if (missingFields.length > 0) {
                return res.status(400).json({
                  success: false,
                  message: `Informations de l'enfant incomplètes. Champs manquants : ${missingFields.join(', ')}`,
                  requiredFields: requiredFields,
                  received: Object.keys(parsedValue)
                });
              }
              
              if (isNaN(Date.parse(parsedValue.birthDate))) {
                return res.status(400).json({
                  success: false,
                  message: `Format de date de naissance invalide pour l'enfant. Utilisez le format YYYY-MM-DD`,
                  received: parsedValue.birthDate
                });
              }
              
              if (!['M', 'F'].includes(parsedValue.sex)) {
                return res.status(400).json({
                  success: false,
                  message: `Le sexe doit être 'M' ou 'F'`,
                  received: parsedValue.sex
                });
              }
            } 
            // Validation pour la mère et le père
            else if (field === 'mother' || field === 'father') {
              const error = validatePerson(parsedValue, field);
              if (error) {
                return res.status(400).json({
                  success: false,
                  message: error
                });
              }
            }
            // Validation pour l'hôpital
            else if (field === 'hospital') {
              if (!parsedValue.name) {
                return res.status(400).json({
                  success: false,
                  message: 'Le nom de l\'hôpital est requis'
                });
              }
              
              const addressError = validateAddress(parsedValue.address, 'hospital address');
              if (addressError) {
                return res.status(400).json({
                  success: false,
                  message: addressError
                });
              }
            }
            
            req.body[field] = parsedValue;
          } catch (e) {
            // Nettoyer les fichiers en cas d'erreur de parsing
            if (req.files) {
              const files = req.files as { [fieldname: string]: Express.Multer.File[] };
              for (const fileArray of Object.values(files)) {
                for (const file of fileArray) {
                  if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                  }
                }
              }
            }
            
            // Message d'erreur plus détaillé
            let errorMessage = `Format JSON invalide pour le champ '${field}'`;
            if (e instanceof SyntaxError) {
              errorMessage += `. Erreur de syntaxe : ${e.message}`;
            }
            
            return res.status(400).json({
              success: false,
              message: errorMessage,
              example: field === 'child' 
                ? {
                    firstName: 'string',
                    lastName: 'string',
                    birthDate: 'YYYY-MM-DD',
                    sex: 'M', // ou 'F'
                    birthPlace: 'string'
                  }
                : {
                    name: 'string',
                    nationality: 'string',
                    birthDate: 'YYYY-MM-DD'
                  }
            });
          }
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  });
};
