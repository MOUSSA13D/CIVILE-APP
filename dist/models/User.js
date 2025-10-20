import { Schema, model } from 'mongoose';
import { ROLES } from '../config/constants.js';
const UserSchema = new Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    name: { type: String, required: true },
    avatarUrl: { type: String },
}, { timestamps: true });
export const User = model('User', UserSchema);
