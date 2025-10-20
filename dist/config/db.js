import mongoose from 'mongoose';
import { env } from './env.js';
export async function connectDB() {
    if (!env.mongoUri)
        return; // skip connect if not provided
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.mongoUri, {
        serverSelectionTimeoutMS: 10000,
    });
}
