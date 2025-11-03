import mongoose from 'mongoose';
import { env } from './env.js';
export async function connectDB() {
    if (!env.mongoUri) {
        console.warn('[MongoDB] MONGODB_URI non défini dans .env !');
        return;
    }
    try {
        mongoose.set('strictQuery', true);
        await mongoose.connect(env.mongoUri, {
            serverSelectionTimeoutMS: 30000, // Timeout 30 secondes
        });
        console.log('[MongoDB] Connecté avec succès à la base :', env.mongoUri.split('/').pop());
    }
    catch (err) {
        console.error('[MongoDB] Erreur de connexion :', err);
        console.error('[MongoDB] Vérifiez :');
        console.error('- Votre URI (MONGODB_URI) dans .env');
        console.error('- Votre IP est whitelistée sur Atlas');
        console.error('- Pas de problème réseau ou firewall');
        process.exit(1);
    }
}
//# sourceMappingURL=db.js.map