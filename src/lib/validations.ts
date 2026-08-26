import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
})

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name is required')
      .min(2, 'Name must be at least 2 characters'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email'),
    phone: z
      .string()
      .min(1, 'Phone number is required')
      .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const addressSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number'),
  addressLine1: z.string().min(1, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z
    .string()
    .min(1, 'Pincode is required')
    .regex(/^\d{6}$/, 'Please enter a valid 6-digit pincode'),
})

export const orderSchema = z.object({
  addressId: z.string().min(1, 'Please select an address'),
  paymentMethod: z.enum(['cod', 'online', 'upi'], {
    error: 'Please select a payment method',
  }),
  couponCode: z.string().optional(),
})

export const reviewSchema = z.object({
  rating: z
    .number()
    .min(1, 'Rating is required')
    .max(5, 'Rating must be between 1 and 5'),
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  comment: z
    .string()
    .min(10, 'Comment must be at least 10 characters')
    .max(1000, 'Comment is too long'),
})

export const sellPhoneSchema = z.object({
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  condition: z.enum(['NEW', 'LIKE_NEW', 'EXCELLENT', 'GOOD', 'FAIR'], {
    error: 'Please select the phone condition',
  }),
  storage: z.string().min(1, 'Storage capacity is required'),
  color: z.string().optional(),
  description: z.string().optional(),
  askingPrice: z
    .number()
    .min(1, 'Price is required')
    .max(200000, 'Price seems too high'),
  images: z.array(z.string()).min(1, 'At least one image is required').max(5, 'Maximum 5 images allowed'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number'),
})

export const repairBookingSchema = z.object({
  serviceId: z.string().min(1, 'Please select a service'),
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  issueDescription: z
    .string()
    .min(10, 'Please describe the issue in at least 10 characters')
    .max(1000, 'Description is too long'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number'),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
})

export const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number')
    .optional(),
  subject: z.string().min(1, 'Subject is required'),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message is too long'),
})

export const couponSchema = z.object({
  code: z
    .string()
    .min(3, 'Code must be at least 3 characters')
    .max(20, 'Code is too long')
    .toUpperCase(),
  description: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed'], {
    error: 'Discount type is required',
  }),
  discountValue: z
    .number()
    .min(1, 'Discount value is required')
    .max(100000, 'Discount value is too high'),
  minOrderAmount: z.number().min(0).optional(),
  maxDiscount: z.number().min(0).optional(),
  usageLimit: z.number().min(1).optional(),
  validFrom: z.string().min(1, 'Start date is required'),
  validUntil: z.string().min(1, 'End date is required'),
  isActive: z.boolean(),
})

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  slug: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  shortDescription: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  brandId: z.string().min(1, 'Brand is required'),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1, 'Variant name is required'),
        sku: z.string().min(1, 'SKU is required'),
        price: z.number().min(1, 'Price is required'),
        discountPrice: z.number().optional(),
        color: z.string().optional(),
        storage: z.string().optional(),
        ram: z.string().optional(),
        stock: z.number().min(0).default(0),
        images: z.array(z.string()),
        isActive: z.boolean().default(true),
      })
    )
    .min(1, 'At least one variant is required'),
})

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  parentId: z.string().optional(),
  isActive: z.boolean(),
  sortOrder: z.number().min(0).default(0),
})

export const bannerSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().optional(),
  image: z.string().min(1, 'Image is required'),
  link: z.string().optional(),
  isActive: z.boolean(),
  sortOrder: z.number().min(0).default(0),
})

export const homepageSectionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum([
    'featured_products',
    'new_arrivals',
    'best_sellers',
    'categories',
    'banners',
    'testimonials',
    'custom',
  ]),
  isActive: z.boolean(),
  sortOrder: z.number().min(0).default(0),
  items: z.array(z.string()).optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type AddressInput = z.infer<typeof addressSchema>
export type OrderInput = z.infer<typeof orderSchema>
export type ReviewInput = z.infer<typeof reviewSchema>
export type SellPhoneInput = z.infer<typeof sellPhoneSchema>
export type RepairBookingInput = z.infer<typeof repairBookingSchema>
export type ContactInput = z.infer<typeof contactSchema>
export type CouponInput = z.infer<typeof couponSchema>
export type ProductInput = z.infer<typeof productSchema>
export type CategoryInput = z.infer<typeof categorySchema>
export type BannerInput = z.infer<typeof bannerSchema>
export type HomepageSectionInput = z.infer<typeof homepageSectionSchema>
