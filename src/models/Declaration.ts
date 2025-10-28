import { Schema, model, Types, Document } from 'mongoose';
import { DeclarationStatus, PAYMENT_PROVIDERS } from '../config/constants.js';

// Interfaces pour les sous-documents
interface IAddress {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  _id?: Types.ObjectId;
}

interface IPersonInfo {
  name: string;
  nationality: string;
  birthDate: Date;
  address: IAddress;
  profession?: string;
  phoneNumber?: string;
  _id?: Types.ObjectId;
}

interface IChildInfo {
  firstName: string;
  lastName: string;
  birthDate: Date;
  sex: 'M' | 'F';
  birthPlace: string;
  birthHospital: string;
  weightAtBirth?: number; // en grammes
  heightAtBirth?: number; // en centimètres
  _id?: Types.ObjectId;
}

interface IPaymentInfo {
  stampPaid: boolean;
  provider?: string;
  transactionId?: string;
  paidAt?: Date;
  _id?: Types.ObjectId;
}

interface IVerificationInfo {
  sentToHospitalAt?: Date;
  hospitalVerifiedAt?: Date;
  hospitalRejectedAt?: Date;
  _id?: Types.ObjectId;
}

interface IExtractInfo {
  html?: string;
  generatedAt?: Date;
  downloadedAt?: Date;
  _id?: Types.ObjectId;
}

// Interface principale pour le modèle Declaration
export interface IDeclaration extends Document {
  parent: Types.ObjectId;
  child: IChildInfo;
  mother: IPersonInfo;
  father: IPersonInfo;
  documents: string[];
  status: DeclarationStatus;
  rejectionReason?: string;
  payment: IPaymentInfo;
  validatedAt?: Date;
  sentToHospitalAt?: Date;
  verification: IVerificationInfo;
  extract: IExtractInfo;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema(
  {
    street: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, default: 'France' },
  },
  { _id: false, timestamps: false }
);

const PersonInfoSchema = new Schema(
  {
    name: { type: String, required: true },
    nationality: { type: String, required: true },
    birthDate: { type: Date, required: true },
    address: { type: AddressSchema, required: true },
    profession: { type: String },
    phoneNumber: { type: String },
  },
  { _id: false, timestamps: false }
);

const ChildInfoSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    birthDate: { type: Date, required: true },
    sex: { type: String, enum: ['M', 'F'], required: true },
    birthPlace: { type: String, required: true },
    birthHospital: { type: String, required: true },
    weightAtBirth: { type: Number }, // en grammes
    heightAtBirth: { type: Number }, // en centimètres
  },
  { _id: false, timestamps: false }
);


const DeclarationSchema = new Schema(
  {
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
  },
  { timestamps: true }
);

export const Declaration = model<IDeclaration>('Declaration', DeclarationSchema);
export default Declaration;
