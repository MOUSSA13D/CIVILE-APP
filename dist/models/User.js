import { Schema, model } from 'mongoose';
import { ROLES } from '../config/constants.js';
import { comparePassword } from '../utils/password.js';
const UserSchema = new Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    name: { type: String, required: true }, // Nom complet (pour compatibilité)
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    avatarUrl: { type: String },
    // Vérification du compte
    isVerified: { type: Boolean, default: false },
    verificationCode: { type: String },
    verificationCodeExpires: { type: Date },
}, { timestamps: true });
// Ajout de la méthode pour comparer les mots de passe
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return await comparePassword(candidatePassword, this.passwordHash);
};
export const User = model('User', UserSchema);
//# sourceMappingURL=User.js.map