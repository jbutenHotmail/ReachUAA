// Define UserRole enum
export enum UserRole {
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  VIEWER = 'VIEWER'
}

// Define User interface
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
  personType?: string;
  lastLogin?: string;
}

// Define AuthState interface
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Define Person interface (consolidated from Colporter and Leader)
export interface Person {
  id: string;
  name: string;
  apellido: string;
  email: string;
  phone: string;
  address: string;
  status: 'ACTIVE' | 'INACTIVE';
  hasUser: boolean;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
  personType: 'COLPORTER' | 'LEADER';
  // Fields specific to colporters
  school?: string;
  age?: string;
  // Fields specific to leaders
  institution?: string;
}

// New Charge interface
export interface Charge {
  id: string;
  personId: string;
  personName: string;
  personType: 'COLPORTER' | 'LEADER';
  amount: number;
  reason: string;
  description?: string;
  category: 'FINE' | 'DEDUCTION' | 'PENALTY' | 'OTHER';
  status: 'PENDING' | 'APPLIED' | 'CANCELLED';
  appliedBy: string;
  appliedByName: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

// Other existing types...
export interface FinancialSummary {
  totalSales: number;
  goal: number;
  achieved: number;
  remaining: number;
  dailySales: number;
  weeklySales: number;
  monthlySales: number;
}

export interface SalesData {
  date: string;
  amount: number;
}

export interface FinancialGoal {
  id: string;
  userId: string;
  amount: number;
  achieved: number;
  startDate: string;
  endDate: string;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY';
}

export interface Book {
  id: string;
  isbn?: string; // ISBN is now optional
  title: string;
  author: string;
  publisher: string;
  price: number;
  category: string;
  description: string;
  imageUrl?: string;
  stock: number;
  sold: number;
  is_active: boolean;
  isActive?: boolean; // Alternative property name
  programId?: string; // New field to associate books with programs
}

// New interface for program-specific book details

export interface ProgramBook {
  id: number;
  program_id: number;
  program_name: string;
  book_id: number;
  book_title: string;
  book_author: string | null;
  book_category: string;
  book_image_url: string | null;
  program_price: string;
  original_price: string;
  initial_stock: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  bookId: string;
  userId: string;
  quantity: number;
  type: 'IN' | 'OUT' | 'SALE' | 'RETURN';
  date: string;
  notes?: string;
}

export interface InventoryCount {
  id: string;
  book_id: string;
  book_title?: string;
  system_count: number;
  manual_count: number | null;
  discrepancy: number;
  lastUpdated?: string;
  updatedBy?: string;
  count_date: string;
  status?: 'PENDING' | 'VERIFIED' | 'DISCREPANCY';
}

export interface Transaction {
  id: string;
  studentId: string;
  studentName: string;
  leaderId: string;
  leaderName: string;
  cash: number;
  checks: number;
  atmMobile: number;
  paypal: number;
  total: number;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  books?: Array<{
    id: string;
    title: string;
    price: number;
    quantity: number;
  }>;
}

export interface CashAdvance {
  id: string;
  personId: string;
  personName: string;
  personType: 'COLPORTER' | 'LEADER';
  weekStartDate: string;
  weekEndDate: string;
  totalSales: number;
  transactionCount: number;
  advanceAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestDate: string;
  approvedDate?: string;
  approvedBy?: string;
  approvedByName?: string;
}

export interface WeeklySales {
  colporterId: string;
  colporterName: string;
  weekStartDate: string;
  weekEndDate: string;
  totalSales: number;
  transactionCount: number;
  dailySales: Record<string, number>;
  maxAdvanceAmount?: number;
  maxAdvancePercentage?: number;
}

// New interface for leader performance based on transactions
export interface LeaderPerformance {
  leaderId: string;
  leaderName: string;
  totalSales: number;
  transactionCount: number;
  uniqueColporters: string[];
  averagePerTransaction: number;
  bestDay: {
    date: string;
    amount: number;
  };
  dailySales: Record<string, number>;
}