// NidLocal — Types TypeScript partagés

import type {
  User,
  GuestProfile,
  HostProfile,
  Listing,
  ListingPhoto,
  Amenity,
  Booking,
  Payment,
  Payout,
  Conversation,
  Message,
  Inspection,
  InspectionMedia,
  Review,
  Dispute,
  Commune,
  LocalRules,
  MunicipalityUser,
  NightCounter,
  UserRole,
  HostType,
  ListingType,
  ResidenceStatus,
  ListingStatus,
  ComplianceStatus,
  CancellationPolicy,
  BookingStatus,
  StayType,
  PaymentStatus,
  PayoutStatus,
  InspectionType,
  InspectionRole,
  MediaType,
  DisputeType,
  DisputeStatus,
} from "@prisma/client";

// Re-export des enums Prisma
export {
  UserRole,
  HostType,
  ListingType,
  ResidenceStatus,
  ListingStatus,
  ComplianceStatus,
  CancellationPolicy,
  BookingStatus,
  StayType,
  PaymentStatus,
  PayoutStatus,
  InspectionType,
  InspectionRole,
  MediaType,
  DisputeType,
  DisputeStatus,
};

// ============================================================
// Types enrichis (avec relations)
// ============================================================

export type UserWithProfiles = User & {
  guestProfile: GuestProfile | null;
  hostProfile: HostProfile | null;
  municipalityUser: (MunicipalityUser & { commune: Commune }) | null;
};

export type ListingCard = Pick<
  Listing,
  | "id"
  | "title"
  | "listingType"
  | "residenceStatus"
  | "city"
  | "latitude"
  | "longitude"
  | "pricePerNight"
  | "cleaningFee"
  | "maxGuests"
  | "bedrooms"
  | "beds"
  | "bathrooms"
  | "hasEcoLabel"
  | "complianceStatus"
  | "allowsInstantBook"
  | "cancellationPolicy"
> & {
  photos: Pick<ListingPhoto, "url" | "caption">[];
  averageRating: number | null;
  totalReviews: number;
  host: Pick<HostProfile, "displayName" | "avatar" | "isVerified">;
};

export type ListingDetail = Listing & {
  photos: ListingPhoto[];
  amenities: { amenity: Amenity }[];
  host: HostProfile & { user: Pick<User, "name" | "createdAt"> };
  commune: Commune & { localRules: LocalRules | null };
  nightCounter: NightCounter | null;
  reviews: (Review & {
    guest: GuestProfile & { user: Pick<User, "name"> };
  })[];
  averageRating: number | null;
  totalReviews: number;
};

export type BookingWithDetails = Booking & {
  listing: Pick<
    Listing,
    | "id"
    | "title"
    | "city"
    | "checkInTime"
    | "checkOutTime"
    | "cancellationPolicy"
  > & {
    photos: Pick<ListingPhoto, "url">[];
    host: Pick<HostProfile, "displayName" | "avatar">;
  };
  guest: GuestProfile & { user: Pick<User, "name" | "email"> };
  payment: Payment | null;
};

export type ConversationWithMessages = Conversation & {
  participants: { userId: string }[];
  messages: (Message & {
    sender: Pick<User, "id" | "name" | "image">;
  })[];
  listing: Pick<Listing, "id" | "title"> & {
    photos: Pick<ListingPhoto, "url">[];
  };
};

export type InspectionWithMedia = Inspection & {
  media: InspectionMedia[];
};

// ============================================================
// Types requêtes / réponses API
// ============================================================

export interface SearchParams {
  destination?: string;
  checkIn?: string;      // ISO date YYYY-MM-DD
  checkOut?: string;
  guests?: number;
  listingType?: ListingType;
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];
  hasEcoLabel?: boolean;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  listings: ListingCard[];
  total: number;
  page: number;
  pages: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null;
}

export interface BookingCreateInput {
  listingId: string;
  checkIn: string;  // YYYY-MM-DD
  checkOut: string;
  guests: number;
}

export interface BookingBreakdown {
  nights: number;
  nightsAmount: number;
  cleaningFee: number;
  serviceFee: number;
  touristTax: number;
  totalAmount: number;
  stayType: StayType;
}

export interface MunicipalityStats {
  totalListings: number;
  byResidenceStatus: {
    primary: number;
    secondary: number;
    professional: number;
  };
  totalNights: number;
  nightsByMonth: { month: string; nights: number }[];
  averageOccupancyRate: number;
}

export interface MunicipalityCompliance {
  registrationRate: number;
  cappedListings: number;
  totalWithCap: number;
  pendingModeration: number;
}

// ============================================================
// Session étendue Auth.js
// ============================================================

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
}

// ============================================================
// Erreurs API
// ============================================================

export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation_error"
  | "email_exists"
  | "dates_unavailable"
  | "night_cap_exceeded"
  | "guests_exceeded"
  | "missing_registration"
  | "incomplete_listing"
  | "already_paid"
  | "already_confirmed"
  | "review_exists"
  | "stay_not_completed"
  | "active_bookings"
  | "cannot_cancel"
  | "internal_error";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, string[]>;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ApiError;
}
