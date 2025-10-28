import { Schema, model, Document, Types } from 'mongoose';

export interface INotification extends Document {
  user: Types.ObjectId;
  type: string;
  message: string;
  isRead: boolean;
  declaration?: Types.ObjectId;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: [
        'declaration_submitted',
        'declaration_verified',
        'declaration_rejected',
        'declaration_approved',
        'document_required',
        'declaration_processed'
      ]
    },
    message: {
      type: String,
      required: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    declaration: {
      type: Schema.Types.ObjectId,
      ref: 'Declaration'
    },
    readAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Index pour les requêtes fréquentes
NotificationSchema.index({ user: 1, isRead: 1 });
NotificationSchema.index({ createdAt: -1 });

export const Notification = model<INotification>('Notification', NotificationSchema);
export default Notification;
