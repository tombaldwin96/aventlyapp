/** Matches website User role from Prisma. */
export type UserRole = 'END_USER' | 'BUSINESS' | 'PERFORMER' | 'ADMIN';

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  status: string;
  endUserProfile?: { id: string } | null;
  businessProfile?: { id: string } | null;
  performerProfile?: { id: string } | null;
  adminStaff?: { id: string; role: string } | null;
}

export interface AuthState {
  user: AppUser | null;
  isLoading: boolean;
  isRestoring: boolean;
  error: string | null;
}

/** GET /api/dashboard response (performer). */
export interface DashboardData {
  user: { id: string; name: string | null; role: string };
  applicationStatus: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED';
  pendingBookingCount: number;
  pendingRequests: Array<{
    id: string;
    customerName: string;
    eventName: string;
    eventDate: string | null;
  }>;
  profileCardData: {
    stageName: string;
    profileImageUrl: string | null;
    profileImagePosition?: string;
    featuredLabels: string[];
    ratingAvg: number | null;
    ratingCount: number;
    isVerified: boolean;
    minPricePence: number | null;
    locationText: string;
  } | null;
  recentBookings: Array<{
    id: string;
    bookingStatus: string;
    customerName: string;
    eventName: string;
    eventDate: string | null;
  }>;
  managedBy: string | null;
}
