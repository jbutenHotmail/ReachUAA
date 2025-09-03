
import { create } from 'zustand';
import { api } from '../api';
import { useProgramStore } from './programStore';
import { Expense } from '../types';

interface BudgetInfo {
  category: string;
  budgetAmount: number;
  currentSpending: number;
  remaining: number;
  percentageUsed: number;
}

interface ExpenseState {
  expenses: Expense[];
  isLoading: boolean;
  error: string | null;
  wereExpensesFetched: boolean;
}

interface ExpenseStore extends ExpenseState {
  fetchExpenses: (params?: Record<string, string>) => Promise<void>;
  fetchBudgetInfo: (category: string) => Promise<BudgetInfo | null>;
  createExpense: (expense: Omit<Expense, 'id' | 'createdBy' | 'createdByName' | 'createdAt' | 'updatedAt'>) => Promise<Expense>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>;
  approveExpense: (id: string) => Promise<Expense>;
  rejectExpense: (id: string) => Promise<Expense>;
  resetStore: () => void;
}

export const useExpenseStore = create<ExpenseStore>((set) => ({
  expenses: [],
  isLoading: false,
  error: null,
  wereExpensesFetched: false,

  fetchExpenses: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      const queryParams: Record<string, string | number> = { ...params };
      if (programId) {
        queryParams.programId = programId;
      }
      
      const expenses = await api.get<Expense[]>('/expenses', { params: queryParams });
      set({ expenses, isLoading: false, wereExpensesFetched: true });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
    }
  },

  fetchBudgetInfo: async (category: string) => {
    set({ isLoading: true, error: null });
    try {
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      if (!programId || !category) {
        throw new Error('Program ID or category not provided');
      }

      // Fetch budget configuration
      const budget = await api.get<{ budget_amount: number }>(
        `/program_expense_budgets?programId=${programId}&category=${category}`
      );

      // Fetch current spending, excluding parent expenses
      const spending = await api.get<{ total: number }>(
        `/expenses`,
        {
          params: {
            programId,
            category,
            status: 'APPROVED',
            isParentExpense: 'FALSE' // Explicitly exclude parent expenses
          }
        }
      );

      const budgetAmount = budget?.budget_amount || 0;
      const currentSpending = spending?.total || 0;
      const remaining = budgetAmount > 0 ? budgetAmount - currentSpending : -1;
      const percentageUsed = budgetAmount > 0 ? (currentSpending / budgetAmount) * 100 : 0;

      const budgetInfo: BudgetInfo = {
        category,
        budgetAmount,
        currentSpending,
        remaining,
        percentageUsed
      };

      set({ isLoading: false });
      return budgetInfo;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
      return null;
    }
  },

  createExpense: async (expenseData) => {
    set({ isLoading: true, error: null });
    try {
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      const dataWithProgram = {
        ...expenseData,
        programId: expenseData.programId || programId
      };
      
      const response = await api.post<any>('/expenses', dataWithProgram);
      
      const newExpense = response;
      set(state => ({
        expenses: [...state.expenses, newExpense],
        isLoading: false,
      }));
      return newExpense;
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error && error.data?.budgetExceeded) {
        const budgetError = new Error(`Presupuesto excedido para ${error.data.budgetInfo.category}. Presupuesto: $${error.data.budgetInfo.budgetAmount}, Gastado: $${error.data.budgetInfo.currentSpending}, Disponible: $${error.data.budgetInfo.remaining}, Solicitado: $${error.data.budgetInfo.requestedAmount}`);
        set({ 
          error: budgetError.message,
          isLoading: false 
        });
        throw budgetError;
      }
      
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
      throw error;
    }
  },

  updateExpense: async (id, expenseData) => {
    set({ isLoading: true, error: null });
    try {
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      const dataWithProgram = {
        ...expenseData,
        programId: expenseData.programId || programId
      };
      
      const updatedExpense = await api.put<Expense>(`/expenses/${id}`, dataWithProgram);
      set(state => ({
        expenses: state.expenses.map(e => 
          e.id === id 
            ? updatedExpense
            : e
        ),
        isLoading: false,
      }));
      return updatedExpense;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
      throw error;
    }
  },

  deleteExpense: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/expenses/${id}`);
      set(state => ({
        expenses: state.expenses.filter(e => e.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
      throw error;
    }
  },

  approveExpense: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const updatedExpense = await api.patch<Expense>(`/expenses/${id}/approve`);
      set(state => ({
        expenses: state.expenses.map(e => 
          Number(e.id) === Number(id) 
            ? updatedExpense
            : e
        ),
        isLoading: false,
      }));
      return updatedExpense;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
      throw error;
    }
  },

  rejectExpense: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const updatedExpense = await api.patch<Expense>(`/expenses/${id}/reject`);
      set(state => ({
        expenses: state.expenses.map(e => 
          e.id === id 
            ? updatedExpense
            : e
        ),
        isLoading: false,
      }));
      return updatedExpense;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
      throw error;
    }
  },

  resetStore: () => {
    set({
      expenses: [],
      isLoading: false,
      error: null,
      wereExpensesFetched: false
    });
  }
}));
