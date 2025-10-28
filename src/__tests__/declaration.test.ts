import request from 'supertest';
import app from '../app';
import mongoose from 'mongoose';
import { Declaration } from '../models/Declaration';
import fs from 'fs';
import path from 'path';

// Données de test
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  firstName: 'Test',
  lastName: 'User',
  role: 'parent',
  isVerified: true
};

let authToken: string;

// Avant tous les tests
beforeAll(async () => {
  // Se connecter à la base de données de test
  await mongoose.connect(process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/civile-app-test');

  // Créer un utilisateur de test et obtenir un token
  await request(app)
    .post('/api/auth/register')
    .send(testUser);

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: testUser.email,
      password: testUser.password
    });

  authToken = loginRes.body.token;
});

// Après tous les tests
afterAll(async () => {
  // Nettoyer la base de données
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Déclaration API', () => {
  // Créer un fichier de test temporaire
  const createTestFile = (filename: string, content = 'test content') => {
    const filePath = path.join(__dirname, 'temp', filename);
    fs.writeFileSync(filePath, content);
    return filePath;
  };

  // Supprimer les fichiers de test
  const cleanupTestFiles = () => {
    const tempDir = path.join(__dirname, 'temp');
    if (fs.existsSync(tempDir)) {
      fs.readdirSync(tempDir).forEach(file => {
        const curPath = path.join(tempDir, file);
        fs.unlinkSync(curPath);
      });
      fs.rmdirSync(tempDir);
    }
  };

  beforeAll(() => {
    // Créer le dossier temp s'il n'existe pas
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Nettoyer les fichiers de test
    cleanupTestFiles();
  });

  describe('POST /api/declarations', () => {
    it('devrait créer une nouvelle déclaration avec des fichiers', async () => {
      // Créer des fichiers de test
      const certPath = createTestFile('certificat.pdf');
      const pereIdPath = createTestFile('pere_id.jpg');
      const mereIdPath = createTestFile('mere_id.jpg');

      // Données de test
      const declarationData = {
        child: JSON.stringify({
          firstName: 'Enfant',
          lastName: 'Test',
          birthDate: '2023-01-01',
          birthPlace: 'Ville',
          sex: 'M'
        }),
        mother: JSON.stringify({
          name: 'Mère Test',
          nationality: 'Sénégalaise',
          birthDate: '1990-01-01'
        }),
        father: JSON.stringify({
          name: 'Père Test',
          nationality: 'Sénégalaise',
          birthDate: '1985-01-01'
        })
      };

      // Envoyer la requête
      const response = await request(app)
        .post('/api/declarations')
        .set('Authorization', `Bearer ${authToken}`)
        .field('child', declarationData.child)
        .field('mother', declarationData.mother)
        .field('father', declarationData.father)
        .attach('certificat_naissance', certPath)
        .attach('piece_identite_pere', pereIdPath)
        .attach('piece_identite_mere', mereIdPath);

      // Vérifications
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.child.firstName).toBe('Enfant');
      expect(response.body.data.mother.name).toBe('Mère Test');
      expect(response.body.data.father.name).toBe('Père Test');
      expect(response.body.data.documents).toHaveLength(3);
      
      // Vérifier que les fichiers existent
      response.body.data.documents.forEach((filePath: string) => {
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });

    it('devrait retourner une erreur si un champ JSON est invalide', async () => {
      const response = await request(app)
        .post('/api/declarations')
        .set('Authorization', `Bearer ${authToken}`)
        .field('child', 'pas un json valide')
        .field('mother', JSON.stringify({ name: 'Mère' }))
        .field('father', JSON.stringify({ name: 'Père' }));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Format JSON invalide');
    });
  });
});
