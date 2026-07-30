import { Schema, model, Document } from 'mongoose';

export interface ISupplementCatalog extends Document {
  sku: string;
  name: string;
  brand?: string;
  benefits: string[];
  usage?: string;
  indications: string[];
  ingredients?: string;
  flavor?: string;
  netWeight?: string;
  netContent?: string;
  imageUrl?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupplementCatalogSchema = new Schema<ISupplementCatalog>(
  {
    sku: { type: String, unique: true, required: true, index: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    brand: String,
    benefits: [String],
    usage: String,
    indications: [String],
    ingredients: String,
    flavor: String,
    netWeight: String,
    netContent: String,
    imageUrl: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const SupplementCatalog = model<ISupplementCatalog>(
  'SupplementCatalog',
  SupplementCatalogSchema
);
