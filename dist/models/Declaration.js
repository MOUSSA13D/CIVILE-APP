import { Schema, model, Types } from 'mongoose';
import { PAYMENT_PROVIDERS } from '../config/constants.js';
const AddressSchema = new Schema({
    street: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, default: 'France' },
}, { _id: false, timestamps: false });
const PersonInfoSchema = new Schema({
    name: { type: String, required: true },
    nationality: { type: String, required: true },
    birthDate: { type: Date, required: true },
    address: { type: AddressSchema, required: true },
    profession: { type: String },
    phoneNumber: { type: String },
}, { _id: false, timestamps: false });
const ChildInfoSchema = new Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    birthDate: { type: Date, required: true },
    sex: { type: String, enum: ['M', 'F'], required: true },
    birthPlace: { type: String, required: true },
    birthHospital: { type: String, required: true },
    weightAtBirth: { type: Number }, // en grammes
    heightAtBirth: { type: Number }, // en centimètres
}, { _id: false, timestamps: false });
const DeclarationSchema = new Schema({
    parent: { type: Types.ObjectId, ref: 'User', required: true },
    child: { type: ChildInfoSchema, required: true },
    mother: { type: PersonInfoSchema, required: true },
    father: { type: PersonInfoSchema, required: true },
    hospital: {
        name: { type: String, required: true },
        address: { type: AddressSchema, required: true },
        phoneNumber: { type: String },
    },
    documents: [String],
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
    // Dates importantes
    validatedAt: Date,
    sentToHospitalAt: Date,
    // Informations de vérification
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
export default Declaration;
//# sourceMappingURL=Declaration.js.map