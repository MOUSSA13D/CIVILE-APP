import { Schema, model, Types } from 'mongoose';
import { PAYMENT_PROVIDERS } from '../config/constants.js';
const PersonInfoSchema = new Schema({
    firstName: String,
    lastName: String,
    cniNumber: String,
    profession: String,
}, { _id: false });
const ChildInfoSchema = new Schema({
    firstName: String,
    lastName: String,
    birthDate: Date,
    sex: { type: String, enum: ['M', 'F'] },
    birthPlace: String,
}, { _id: false });
const DocumentsSchema = new Schema({
    certificatePhotoUrl: String,
    certificateNumber: String,
    hospitalName: String,
}, { _id: false });
const DeclarationSchema = new Schema({
    parent: { type: Types.ObjectId, ref: 'User', required: true },
    child: ChildInfoSchema,
    mother: PersonInfoSchema,
    father: PersonInfoSchema,
    documents: DocumentsSchema,
    status: {
        type: String,
        enum: ['pending', 'in_verification', 'validated', 'rejected'],
        default: 'pending',
        index: true,
    },
    rejectionReason: String,
    payment: {
        stampPaid: { type: Boolean, default: false },
        provider: { type: String, enum: PAYMENT_PROVIDERS },
        transactionId: String,
        paidAt: Date,
    },
    verification: {
        sentToHospitalAt: Date,
        hospitalVerifiedAt: Date,
        hospitalRejectedAt: Date,
    },
    extract: {
        html: String,
        generatedAt: Date,
        downloadedAt: Date,
        downloadCount: { type: Number, default: 0 },
    },
}, { timestamps: true });
export const Declaration = model('Declaration', DeclarationSchema);
