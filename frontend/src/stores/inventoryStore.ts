import { create } from 'zustand';
import { Book, InventoryMovement, ProgramBook, InventoryCount } from '../types';
import { api } from '../api';
import { useProgramStore } from './programStore';

interface InventoryState {
  books: Book[];
  programBooks: ProgramBook[];
  movements: InventoryMovement[];
  inventoryCounts: InventoryCount[];
  isLoading: boolean;
  error: string | null;
  wereBooksLoaded: boolean;
}

interface InventoryStore extends InventoryState {
  fetchBooks: () => Promise<void>;
  fetchBookById: (id: string) => Promise<Book | undefined>;
  createBook: (book: Omit<Book, 'id'>) => Promise<void>;
  updateBook: (id: string, book: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  toggleBookStatus: (id: string) => Promise<void>;
  fetchMovements: (bookId?: string) => Promise<void>;
  createMovement: (bookId: string, movement: { quantity: number; movementType: 'IN' | 'OUT' | 'SALE' | 'RETURN'; notes?: string }) => Promise<void>;
  fetchInventoryCounts: (date?: string) => Promise<void>;
  updateInventoryCount: (bookId: string, data: { manualCount: number; countDate: string; systemCount: number; confirmDiscrepancy?: boolean; setVerified?: boolean }) => Promise<void>;
  updateBooksAfterTransaction: (transaction: any, isApproval: boolean) => void;
  resetStore: () => void;
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  books: [],
  programBooks: [],
  movements: [],
  inventoryCounts: [],
  isLoading: false,
  error: null,
  wereBooksLoaded: false,

  fetchBooks: async () => {
    set({ isLoading: true, error: null });
    try {
      // Get current program ID
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      // Add program filter if available
      const params: Record<string, string | number> = {};
      if (programId) {
        params.programId = programId;
      }
      
      const books = await api.get<Book[]>('/books', { params });
      set({ books, isLoading: false, wereBooksLoaded: true });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false,
        wereBooksLoaded: true
      });
    }
  },

  fetchBookById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // Get current program ID
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      // Add program filter if available
      const params: Record<string, string | number> = {};
      if (programId) {
        params.programId = programId;
      }
      
      const book = await api.get<Book>(`/books/${id}`, { params });
      set({ isLoading: false });
      return book;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false,
      });
    }
  },

  createBook: async (book) => {
    set({ isLoading: true, error: null });
    try {
      // Get current program ID
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      // Add program ID to book data
      const bookWithProgram = {
        ...book,
        programId
      };
      
      const newBook = await api.post<Book>('/books', bookWithProgram);
      set((state) => ({ books: [...state.books, newBook], isLoading: false }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false,
      });
      throw error;
    }
  },

  updateBook: async (id, bookData) => {
    set({ isLoading: true, error: null });
    try {
      // Get current program ID
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      // Add program ID to book data if not already present
      const bookWithProgram = {
        ...bookData,
        programId: bookData.programId || programId
      };
      
      const updatedBook = await api.put<Book>(`/books/${id}`, bookWithProgram);
      set((state) => ({
        books: state.books.map(b => b.id === id ? updatedBook : b),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteBook: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/books/${id}`);
      set((state) => ({
        books: state.books.filter(b => b.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false,
      });
      throw error;
    }
  },

  toggleBookStatus: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { is_active } = await api.patch<{ message: string; is_active: boolean }>(`/books/${id}/toggle-status`);
      set((state) => ({
        books: state.books.map(b => 
          b.id === id ? { ...b, is_active } : b
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false,
      });
      throw error;
    }
  },

  fetchMovements: async (bookId) => {
    set({ isLoading: true, error: null });
    try {
      if (!bookId) {
        set({ movements: [], isLoading: false });
        return;
      }
      
      // Get current program ID
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      // Add program filter if available
      const params: Record<string, string | number> = {};
      if (programId) {
        params.programId = programId;
      }
      
      const movements = await api.get<InventoryMovement[]>(`/books/${bookId}/movements`, { params });
      set({ movements, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false,
      });
    }
  },

  createMovement: async (bookId, movement) => {
    set({ isLoading: true, error: null });
    try {
      // Get current program ID
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      // Add program ID to movement data
      const movementWithProgram = {
        ...movement,
        programId
      };
      
      const { book } = await api.post<{ message: string; book: Book }>(`/books/${bookId}/movements`, movementWithProgram);
      
      // Update the book in the store
      set((state) => ({
        books: state.books.map(b => b.id === bookId ? book : b),
        isLoading: false,
      }));
      
      // Refresh movements
      await get().fetchMovements(bookId);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false,
      });
      throw error;
    }
  },

  fetchInventoryCounts: async (date) => {
    set({ isLoading: true, error: null });
    try {
      const countDate = date || new Date().toISOString().split('T')[0];
      
      // Get current program ID
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      // Add program filter if available
      const params: Record<string, string | number> = {};
      if (programId) {
        params.programId = programId;
      }
      
      const counts = await api.get<InventoryCount[]>(`/books/counts/${countDate}`, { params });
      
      set({ inventoryCounts: counts, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false,
      });
    }
  },

  updateInventoryCount: async (bookId, data) => {
    set({ isLoading: true, error: null });
    try {
      // Get current program ID
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      // Add program ID to data
      const dataWithProgram = {
        ...data,
        programId
      };
      
      const { count, book } = await api.post<{ 
        message: string; 
        count: InventoryCount;
        book?: Book;
      }>(`/books/${bookId}/counts`, dataWithProgram);
      
      // Update the inventory counts in the store
      set((state) => {
        const existingIndex = state.inventoryCounts.findIndex(
          c => c.book_id === bookId && c.count_date === data.countDate
        );
        
        if (existingIndex >= 0) {
          // Update existing count
          const updatedCounts = [...state.inventoryCounts];
          updatedCounts[existingIndex] = count;
          return { inventoryCounts: updatedCounts, isLoading: false };
        } else {
          // Add new count
          return { 
            inventoryCounts: [...state.inventoryCounts, count], 
            isLoading: false 
          };
        }
      });
      
      // If we confirmed the discrepancy and got an updated book back,
      // update the book in the store
      if (data.confirmDiscrepancy && book) {
        set((state) => ({
          books: state.books.map(b => 
            b.id === bookId ? book : b
          ),
        }));
      }
      
      return count;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false,
      });
      throw error;
    }
  },

  // Method to update books after a transaction is approved or rejected
  updateBooksAfterTransaction: (transaction, isApproval) => {
    // Only process if we have books in the transaction
    if (!transaction.books || transaction.books.length === 0) return;
    
    // Get current books
    const currentBooks = get().books;
    if (currentBooks.length === 0) return;
    
    // Create a copy of the current books
    const updatedBooks = [...currentBooks];
    
    // Update each book's stock and sold counts
    transaction.books.forEach(transactionBook => {
      const bookIndex = updatedBooks.findIndex(b => b.id === transactionBook.id);
      if (bookIndex >= 0) {
        const book = updatedBooks[bookIndex];
        
        // If approving, increase sold count
        // If rejecting a previously approved transaction, decrease sold count
        if (isApproval) {
          updatedBooks[bookIndex] = {
            ...book,
            sold: book.sold + transactionBook.quantity
          };
        } else {
          updatedBooks[bookIndex] = {
            ...book,
            sold: Math.max(0, book.sold - transactionBook.quantity) // Ensure we don't go below 0
          };
        }
      }
    });
    
    // Update the state with the new books
    set({ books: updatedBooks });
    
    // After updating books, refresh inventory counts for today
    const today = new Date().toISOString().split('T')[0];
    get().fetchInventoryCounts(today);
  },

  // Reset store method
  resetStore: () => {
    set({
      books: [],
      programBooks: [],
      movements: [],
      inventoryCounts: [],
      isLoading: false,
      error: null,
      wereBooksLoaded: false
    });
  }
}));