import { Schema, model, Document } from 'mongoose';
import { ROLES, Role } from '../config/constants.js';
import { comparePassword } from '../utils/password.js';

const UserSchema = new Schema(
  {
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
  },
  { timestamps: true }
);

export interface IUser extends Document {
  [key: string]: any;  // Signature d'index
  _id: any;
  email: string;
  passwordHash: string;
  role: Role;
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  avatarUrl?: string;
  isVerified: boolean;
  verificationCode?: string;
  verificationCodeExpires?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Ajout de la méthode pour comparer les mots de passe
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return await comparePassword(candidatePassword, this.passwordHash);
};

export const User = model<IUser>('User', UserSchema);
