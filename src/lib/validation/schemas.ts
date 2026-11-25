import { z } from 'zod';

const safeImagePathOrUrl = z
  .string()
  .min(1)
  .max(2048)
  .refine(
    (v) =>
      v.startsWith('/images/') ||
      v.startsWith('/api/media/') ||
      v.startsWith('https://') ||
      v.startsWith('http://'),
    'Must be a valid uploaded media path or URL'
  );

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const switchDemoSchema = z.object({
  userId: z.string().trim().min(1, 'userId is required'),
});

export const brokerVerificationDocsSchema = z
  .object({
    reraAuthority: z.string().trim().min(2).max(100).optional(),
    govtIdType: z.string().trim().max(80).optional(),
    govtIdNumber: z.string().trim().max(80).optional(),
    govtIdFileName: z.string().trim().max(200).optional(),
    govtIdFileKey: z.string().trim().max(500).optional(),
    govtIdFileData: z.string().max(6_000_000).optional(),
    agencyRegFileName: z.string().trim().max(200).optional(),
    reraCertificateName: z.string().trim().max(200).optional(),
    businessEmail: z.string().trim().email().or(z.literal('')).optional(),
    businessPhone: z.string().trim().max(30).optional(),
    submittedAt: z.string().optional(),
    rejectionReason: z.string().max(400).optional(),
  })
  .optional();

export const brokerProfileInputSchema = z.object({
  isIndependent: z.boolean().optional(),
  agencyName: z.string().trim().max(160).optional(),
  agencyAddress: z.string().trim().max(300).optional(),
  phone: z.string().trim().min(5).max(30).optional(),
  operatingLocalities: z.array(z.string().trim().min(1).max(80)).max(25).optional(),
  propertyCategories: z.array(z.enum(['Flat', 'House', 'Room'])).max(5).optional(),
  specializations: z
    .array(
      z.enum([
        'Residential rentals',
        'Residential sales',
        'Commercial rentals',
        'Commercial sales',
        'PG and co-living',
        'Independent houses',
        'Apartments',
        'Villas',
      ])
    )
    .max(10)
    .optional(),
  yearsExperience: z.coerce.number().int().min(0).max(80).optional(),
  propertiesManagedCount: z.coerce.number().int().min(0).max(10000).optional(),
  website: z.string().trim().max(300).optional(),
  reraId: z.string().trim().min(3).max(120).optional(),
  avatarUrl: safeImagePathOrUrl.optional(),
  bio: z.string().trim().max(1200).optional(),
  verificationDocs: brokerVerificationDocsSchema,
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Full name is required').max(120),
  email: z.string().trim().email('Valid email is required'),
  phone: z.string().trim().min(6, 'Phone number is required').max(30),
  role: z.enum(['seeker', 'broker']),
  city: z.string().trim().min(2).max(80).optional().default('Bengaluru'),
  avatarUrl: safeImagePathOrUrl.optional(),
  authMethod: z.enum(['password', 'otp']).optional().default('password'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128).optional(),
  brokerProfile: brokerProfileInputSchema.optional(),
}).superRefine((input, ctx) => {
  if (input.role === 'broker' && !input.brokerProfile) {
    ctx.addIssue({ code: 'custom', path: ['brokerProfile'], message: 'Broker profile and state RERA registration are required.' });
  }
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(6).max(30).optional(),
  city: z.string().trim().min(2).max(80).optional(),
  avatarUrl: safeImagePathOrUrl.optional(),
  brokerProfile: brokerProfileInputSchema.optional(),
});

export const createRequirementSchema = z
  .object({
    seekerName: z.string().trim().min(2).max(120).optional(),
    seekerPhone: z.string().trim().max(30).optional(),
    seekerEmail: z.string().trim().email().optional(),
    intent: z.enum(['rent', 'buy']),
    localities: z.array(z.string().trim().min(1).max(80)).min(1).max(10),
    budgetMin: z.coerce.number().int().min(0).max(1_000_000_000),
    budgetMax: z.coerce.number().int().positive().max(1_000_000_000),
    propertyType: z.enum(['Flat', 'House', 'Room']),
    bedrooms: z.coerce.number().int().min(1).max(10),
    furnishing: z.enum(['Furnished', 'Semi-furnished', 'Unfurnished', 'Any']).default('Any'),
    moveInDate: z.string().trim().min(1).max(40),
    amenities: z.array(z.string().trim().min(1).max(80)).max(25).default([]),
    notes: z.string().trim().max(1500).default(''),
  })
  .refine((v) => v.budgetMax >= v.budgetMin, {
    message: 'Maximum budget must be greater than or equal to minimum budget',
    path: ['budgetMax'],
  });

export const updateRequirementSchema = z.object({
  status: z.enum(['active', 'paused', 'fulfilled']).optional(),
  localities: z.array(z.string().trim().min(1).max(80)).min(1).max(10).optional(),
  budgetMin: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  budgetMax: z.coerce.number().int().positive().max(1_000_000_000).optional(),
  furnishing: z.enum(['Furnished', 'Semi-furnished', 'Unfurnished', 'Any']).optional(),
  moveInDate: z.string().trim().min(1).max(40).optional(),
  amenities: z.array(z.string().trim().min(1).max(80)).max(25).optional(),
  notes: z.string().trim().max(1500).optional(),
});

export const createPropertySchema = z.object({
  title: z.string().trim().min(3, 'Title is required').max(180),
  intent: z.enum(['rent', 'buy']),
  transactionType: z
    .enum(['For Rent', 'For Sale', 'PG / Shared Accommodation', 'Lease'])
    .optional(),
  listingCategory: z
    .enum([
      'Apartment / Flat',
      'Independent House',
      'Villa',
      'PG / Hostel',
      'Commercial Space',
      'Office Space',
      'Shop',
      'Other',
    ])
    .optional(),
  locality: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80).optional().default('Bengaluru'),
  pincode: z.string().trim().max(16).optional(),
  landmark: z.string().trim().max(160).optional(),
  address: z.string().trim().min(3).max(300),
  price: z.coerce.number().int().positive().max(2_000_000_000),
  securityDeposit: z.coerce.number().int().min(0).max(2_000_000_000).optional(),
  maintenanceCharges: z.coerce.number().int().min(0).max(10_000_000).optional(),
  pricePerSqFt: z.coerce.number().int().min(0).max(10_000_000).optional(),
  brokerageAmount: z.coerce.number().min(0).max(100_000_000).optional(),
  brokerageType: z.enum(['fixed', 'percentage']).optional(),
  depositOrMaintenance: z.string().trim().max(220).optional(),
  brokerageFee: z.string().trim().max(140).default('Standard Brokerage'),
  propertyType: z.enum(['Flat', 'House', 'Room']),
  bedrooms: z.coerce.number().int().min(1).max(15),
  bathrooms: z.coerce.number().int().min(1).max(15),
  areaSqFt: z.coerce.number().int().positive().max(100_000),
  carpetAreaSqFt: z.coerce.number().int().positive().max(100_000).optional(),
  builtUpAreaSqFt: z.coerce.number().int().positive().max(100_000).optional(),
  floorInfo: z.string().trim().max(120).default('Ground Floor'),
  floorNumber: z.coerce.number().int().min(0).max(150).optional(),
  totalFloors: z.coerce.number().int().min(1).max(150).optional(),
  furnishing: z.enum(['Furnished', 'Semi-furnished', 'Unfurnished']),
  parking: z.string().trim().max(120).optional(),
  balconies: z.coerce.number().int().min(0).max(20).optional(),
  propertyAge: z.string().trim().max(60).optional(),
  availableFrom: z.string().trim().max(80).default('Immediate'),
  amenities: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  description: z.string().trim().max(4000).default(''),
  additionalInfo: z.string().trim().max(2000).optional(),
  sellingPoints: z.array(z.string().trim().min(1).max(160)).max(10).optional(),
  videoTourUrl: z.string().trim().max(400).optional(),
  images: z.array(safeImagePathOrUrl).min(1, 'At least one image is required').max(15),
  availability: z
    .enum(['available', 'draft', 'rented', 'sold', 'inactive'])
    .default('available'),
  mapX: z.coerce.number().min(0).max(100).default(50),
  mapY: z.coerce.number().min(0).max(100).default(50),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

export const updatePropertySchema = createPropertySchema.partial();

export const createProposalSchema = z.object({
  requirementId: z.string().trim().min(1),
  propertyId: z.string().trim().min(1),
  proposedPrice: z.coerce.number().int().positive().max(2_000_000_000),
  brokerageCharge: z.string().trim().min(1).max(140),
  message: z.string().trim().min(5, 'Include a short pitch note').max(2000),
  whyMatches: z.string().trim().max(600).optional(),
  availabilityConfirmed: z.boolean().optional().default(true),
});

export const updateProposalSchema = z.object({
  status: z.enum(['pending', 'shortlisted', 'accepted', 'declined']).optional(),
  statusDetail: z
    .enum([
      'Sent',
      'Viewed',
      'Interested',
      'Visit Requested',
      'Visit Scheduled',
      'Rejected',
      'Closed',
    ])
    .optional(),
  contactShared: z.boolean().optional(),
  markViewed: z.boolean().optional(),
});

export const createVisitSchema = z.object({
  propertyId: z.string().trim().min(1),
  proposalId: z.string().trim().min(1).optional(),
  date: z.string().trim().min(4).max(40),
  timeSlot: z.string().trim().min(2).max(40),
  notes: z.string().trim().max(600).optional(),
});

export const updateVisitSchema = z.object({
  status: z.enum(['requested', 'confirmed', 'completed', 'cancelled']),
});

export const createMessageSchema = z.object({
  propertyId: z.string().trim().min(1),
  proposalId: z.string().trim().min(1).optional(),
  recipientId: z.string().trim().min(1),
  body: z.string().trim().min(1, 'Message cannot be empty').max(2000),
});

export const toggleSavedSchema = z.object({
  propertyId: z.string().trim().min(1),
});

export const markNotificationsReadSchema = z.object({
  notificationId: z.string().trim().min(1).optional(),
});

export const createReviewSchema = z.object({
  brokerId: z.string().trim().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(5, 'Review comment is too short').max(1500),
  locality: z.string().trim().max(80).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateRequirementInput = z.infer<typeof createRequirementSchema>;
export type UpdateRequirementInput = z.infer<typeof updateRequirementSchema>;
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type CreateProposalInput = z.infer<typeof createProposalSchema>;
export type UpdateProposalInput = z.infer<typeof updateProposalSchema>;
export type CreateVisitInput = z.infer<typeof createVisitSchema>;
export type UpdateVisitInput = z.infer<typeof updateVisitSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
