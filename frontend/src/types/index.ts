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
  profile_image_url?: string;
  createdAt: string;
  updatedAt: string;
  personType?: string;
  personId?: string; // ID de la persona asociada
  lastLogin?: string;
  status: 'ACTIVE' | 'INACTIVE';
  programStatus?: 'ACTIVE' | 'INACTIVE'; // Estado específico del programa
  currentProgramId?: number; // ID del programa actual
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
  profile_image_url?: string;
  createdAt: string;
  updatedAt: string;
  personType: 'COLPORTER' | 'LEADER';
  programId?: number | null;
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

// Expense interface
export interface Expense {
  id: string;
  leaderId: string | null;
  leaderName: string;
  forLeaderId?: string | null;
  forLeaderName?: string | null;
  amount: number;
  motivo: string;
  category: string;
  notes?: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

// Other existing types...
export interface FinancialSummary {
  totalSales: number;
  dailySales: number;
  weeklySales: number;
  monthlySales: number;
}

export interface SalesData {
  date: string;
  amount: number;
}

export interface InventoryCount {
  id: string;
  book_id: string;
  book_title?: string;
  book_size?: string;
  system_count: number;
  manual_count: number | null;
  discrepancy: number;
  updated_at?: string;
  updatedBy?: string;
  count_date: string;
  status?: 'PENDING' | 'VERIFIED' | 'DISCREPANCY';
}

export interface Book {
  id: string;
  isbn?: string; // ISBN is now optional
  title: string;
  author: string;
  publisher: string;
  price: number;
  size: string;
  category: string;
  description: string;
  image_url?: string;
  stock: number;
  sold: number;
  is_active: boolean;
  programId?: string; // New field to associate books with programs
}

// Book size classification
export enum BookSize {
  LARGE = 'LARGE',
  SMALL = 'SMALL'
}

// Function to determine book size based on price or size property
export function getBookSize(price: number): BookSize {
  return price >= 20 ? BookSize.LARGE : BookSize.SMALL;
}

// New interface for program-specific book details
export interface ProgramBook {
  bookId: string;
  price: number; // Program-specific price
  initialStock: number; // Initial stock for this program
  is_active: boolean; // Whether the book is active in the program
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

// Define interfaces for program working days and custom days
export interface WorkingDay {
  id: number;
  program_id: number;
  day_of_week: string;
  is_working_day: number | boolean;
}

export interface CustomDay {
  id: number;
  program_id: number;
  date: string;
  is_working_day: number | boolean;
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
  hoursWorked: number;
  books?: Array<{
    id: string;
    title: string;
    price: number;
    quantity: number;
    size: string;
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

export interface Colporter {
  id: string;
  name: string;
  apellido: string;
  email: string;
  phone?: string;
  school: string;
  address?: string;
  age: string;
  status: 'ACTIVE' | 'INACTIVE';
  hasUser: boolean;
  createdAt: string;
  updatedAt: string;
  profile_image_url?: string;
  programId?: number | null;
}

export interface Leader {
  id: string;
  name: string;
  apellido: string;
  email: string;
  phone?: string;
  institution: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE';
  hasUser: boolean;
  createdAt: string;
  updatedAt: string;
  programId?: number | null;
}

// Updated ProgramConfig interface with achieved property
export interface ProgramConfig {
  id: number;
  name: string;
  motto: string;
  start_date: string;
  end_date: string;
  financial_goal: string;
  logo_url: string | null;
  is_active: number | boolean;
  created_at: string;
  updated_at: string;
  achieved?: number; // Added this property
  financialConfig: {
    id: number;
    program_id: number;
    colporter_percentage: string;
    leader_percentage: string;
    colporter_cash_advance_percentage: string;
    leader_cash_advance_percentage: string;
    created_at: string;
    updated_at: string;
  };
  workingDays: {
    id: number;
    program_id: number;
    day_of_week: string;
    is_working_day: number | boolean;
  }[];
  customDays: {
    id: number;
    program_id: number;
    date: string;
    is_working_day: number | boolean;
  }[];
  books: ProgramBook[];
}

// App settings interface
export interface AppSettings {
  language: string;
  theme: string;
  notifications: boolean;
}

// Bible Study interface
export interface BibleStudy {
  id: string;
  colporterId: string;
  colporterName: string;
  name: string;
  phone: string;
  address?: string;
  location?: string;
  municipalityId?: number;
  municipalityName?: string;
  countryName?: string;
  studyType: 'Estudio Bíblico' | 'Grupo de Oración' | 'Matrimonio y Familia';
  interestTopic?: string;
  physicalDescription?: string;
  photoUrl?: string;
  notes?: string;
  programId: number;
  createdAt: string;
  updatedAt: string;
}

// Municipality interface
export interface Municipality {
  id: number;
  name: string;
  countryId: number;
  countryName: string;
}

// Country interface
export interface Country {
  id: number;
  name: string;
  code: string;
}

// Leader percentage interface
export interface LeaderPercentage {
  id: string;
  leaderId: string;
  leaderName: string;
  programId: number;
  programName: string;
  percentage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Bonification interfaces
export interface BonificationLevel {
  type: 'GOLD' | 'SILVER';
  requiredHours: number;
  requiredAmount: number;
  rewardAmount: number;
}

export interface ColporterBonificationStatus {
  colporterId: string;
  colporterName: string;
  currentHours: number;
  currentNetAmount: number;
  silverStatus: {
    achieved: boolean;
    hoursProgress: number;
    amountProgress: number;
    hoursRemaining: number;
    amountRemaining: number;
  };
  goldStatus: {
    achieved: boolean;
    hoursProgress: number;
    amountProgress: number;
    hoursRemaining: number;
    amountRemaining: number;
  };
  nextTarget: 'SILVER' | 'GOLD' | 'COMPLETED';
}