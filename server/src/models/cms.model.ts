import mongoose, { Schema, Document } from 'mongoose'

export interface IHomepageSection extends Document {
  _id: mongoose.Types.ObjectId
  title: string
  subtitle?: string
  type: string
  productIds: string[]
  ctaText?: string
  ctaLink?: string
  image?: string
  isActive: boolean
  sortOrder: number
  background?: string
  createdAt: Date
  updatedAt: Date
}

const homepageSectionSchema = new Schema<IHomepageSection>({
  title: { type: String, required: true, trim: true },
  subtitle: { type: String },
  type: { type: String, required: true },
  productIds: { type: [String], default: [] },
  ctaText: { type: String },
  ctaLink: { type: String },
  image: { type: String },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  background: { type: String },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})

homepageSectionSchema.index({ sortOrder: 1 })
homepageSectionSchema.index({ isActive: 1 })

export const HomepageSection = mongoose.model<IHomepageSection>('HomepageSection', homepageSectionSchema)

export interface IBanner extends Document {
  _id: mongoose.Types.ObjectId
  title: string
  subtitle?: string
  image: string
  ctaText?: string
  ctaLink?: string
  isActive: boolean
  sortOrder: number
  startDate?: Date
  endDate?: Date
  createdAt: Date
  updatedAt: Date
}

const bannerSchema = new Schema<IBanner>({
  title: { type: String, required: true, trim: true },
  subtitle: { type: String },
  image: { type: String, required: true },
  ctaText: { type: String },
  ctaLink: { type: String },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  startDate: { type: Date },
  endDate: { type: Date },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})

bannerSchema.index({ sortOrder: 1 })
bannerSchema.index({ isActive: 1 })

export const Banner = mongoose.model<IBanner>('Banner', bannerSchema)

export interface IInformationCard extends Document {
  _id: mongoose.Types.ObjectId
  title: string
  description?: string
  icon?: string
  image?: string
  ctaText?: string
  ctaLink?: string
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

const informationCardSchema = new Schema<IInformationCard>({
  title: { type: String, required: true, trim: true },
  description: { type: String },
  icon: { type: String },
  image: { type: String },
  ctaText: { type: String },
  ctaLink: { type: String },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})

informationCardSchema.index({ sortOrder: 1 })
informationCardSchema.index({ isActive: 1 })

export const InformationCard = mongoose.model<IInformationCard>('InformationCard', informationCardSchema)

export interface ITestimonial extends Document {
  _id: mongoose.Types.ObjectId
  customerName: string
  customerImage?: string
  rating: number
  comment: string
  isActive: boolean
  sortOrder: number
  createdAt: Date
}

const testimonialSchema = new Schema<ITestimonial>({
  customerName: { type: String, required: true, trim: true },
  customerImage: { type: String },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, {
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})

testimonialSchema.index({ sortOrder: 1 })
testimonialSchema.index({ isActive: 1 })

export const Testimonial = mongoose.model<ITestimonial>('Testimonial', testimonialSchema)

export interface IFAQ extends Document {
  _id: mongoose.Types.ObjectId
  question: string
  answer: string
  category?: string
  sortOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const faqSchema = new Schema<IFAQ>({
  question: { type: String, required: true, trim: true },
  answer: { type: String, required: true },
  category: { type: String },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})

faqSchema.index({ sortOrder: 1 })
faqSchema.index({ isActive: 1 })
faqSchema.index({ category: 1 })

export const FAQ = mongoose.model<IFAQ>('FAQ', faqSchema)
