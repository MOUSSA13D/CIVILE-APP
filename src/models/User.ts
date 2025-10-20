import { Schema, model } from 'mongoose';
import { ROLES, Role } from '../config/constants.js';

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    name: { type: String, required: true },
    avatarUrl: { type: String },
  },
  { timestamps: true }
);

export interface IUser {
  _id: any;
  email: string;
  passwordHash: string;
  role: Role;
  name: string;
  avatarUrl?: string;
}

export const User = model<IUser>('User', UserSchema);
