export enum UserRole {
  ADMIN = "ADMIN",
  SUPERVISOR = "SUPERVISOR",
  VIEWER = "VIEWER",
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  personId?: number;
  active: boolean;
  createdAt: string;
}

export interface Program {
  id: number;
  name: string;
  motto?: string;
  startDate: string;
  endDate: string;
  financialGoal: number;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Person {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  profileImageUrl?: string;
  personType: "COLPORTER" | "LEADER";
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface Colporter extends Person {
  school: string;
  age?: number;
}

export interface Leader extends Person {
  institution: string;
}

export interface Book {
  id: number;
  programId: number;
  title: string;
  author?: string;
  price: number;
  cost: number;
  size: BookSize;
  stock: number;
  sold: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export enum BookSize {
  SMALL = "SMALL",
  MEDIUM = "MEDIUM",
  LARGE = "LARGE",
}

export const getBookSize = (size: string): string => {
  switch (size) {
    case BookSize.SMALL:
      return "Pequeño";
    case BookSize.MEDIUM:
      return "Mediano";
    case BookSize.LARGE:
      return "Grande";
    default:
      return size;
  }
};

export interface Transaction {
  id: number;
  programId: number;
  studentId: number;
  studentName: string;
  leaderId: number;
  leaderName: string;
  cash: number;
  checks: number;
  atmMobile: number;
  paypal: number;
  total: number;
  hoursWorked: number;
  transactionDate: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdBy: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: number;
  programId: number;
  type: "FOOD" | "HEALTH" | "SUPPLIES" | "MAINTENANCE" | "FUEL" | "OTHER";
  amount: number;
  description?: string;
  expenseDate: string;
  createdBy: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashAdvance {
  id: number;
  programId: number;
  personId: number;
  personName: string;
  amount: number;
  advanceDate: string;
  createdBy: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Charge {
  id: string;
  programId: number;
  personId: number;
  personName: string;
  category: "FINE" | "DEDUCTION" | "PENALTY" | "PROGRAM_FEE" | "FOOD" | "MEDICAL_INSURANCE" | "OTHER";
  reason: string;
  status: "PENDING" | "APPLIED" | "CANCELLED";
  amount: number;
  date: string;
  description?: string;
  chargeDate: string;
  createdBy: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface BibleStudy {
  id: number;
  programId: number;
  studentId: number;
  studentName: string;
  contactName: string;
  phone?: string;
  address?: string;
  interest: string;
  notes?: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  createdBy: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaderPercentage {
  id: number;
  programId: number;
  leaderId: number;
  leaderName: string;
  percentage: number;
  effectiveDate: string;
  createdBy: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkingDay {
  dayOfWeek: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  isWorkingDay: boolean;
}

export interface CustomDay {
  date: string;
  isWorkingDay: boolean;
}

export interface BonificationStatus {
  achieved: boolean;
  hoursProgress: number;
  amountProgress: number;
  hoursRemaining: number;
  amountRemaining: number;
}

export interface ColporterBonificationStatus {
  colporterId: string;
  colporterName: string;
  currentHours: number;
  currentNetAmount: number;
  silverStatus: BonificationStatus;
  goldStatus: BonificationStatus;
  nextTarget: "SILVER" | "GOLD" | "COMPLETED";
}

export interface Bonus {
  id: number;
  programId: number;
  personId: number;
  personName: string;
  programName: string;
  amount: number;
  description?: string;
  bonusDate: string;
  createdBy: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}
