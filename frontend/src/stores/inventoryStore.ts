import { create } from 'zustand';
import { Book, InventoryMovement, ProgramBook, InventoryCount } from '../types';
import { api } from '../api';

interface InventoryState {
  books: Book[];
  programBooks: ProgramBook[];
  movements: InventoryMovement[];
  inventoryCounts: InventoryCount[];
  isLoading: boolean;
  error: string | null;
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
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  books: [],
  programBooks: [],
  movements: [],
  inventoryCounts: [],
  isLoading: false,
  error: null,

  fetchBooks: async () => {
    set({ isLoading: true, error: null });
    try {
      const books = await api.get<Book[]>('/books');
      set({ books, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false,
      });
    }
  },

  fetchBookById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const book = await api.get<Book>(`/books/${id}`);
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
      const newBook = await api.post<Book>('/books', book);
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
      const updatedBook = await api.put<Book>(`/books/${id}`, bookData);
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
      
      const movements = await api.get<InventoryMovement[]>(`/books/${bookId}/movements`);
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
      const { book } = await api.post<{ message: string; book: Book }>(`/books/${bookId}/movements`, movement);
      
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
      
      // This would be the actual API call
      const counts = await api.get<InventoryCount[]>(`/books/counts/${countDate}`);
      
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
      // In a real implementation, this would call the API
      const { count, book } = await api.post<{ 
        message: string; 
        count: InventoryCount;
        book?: Book;
      }>(`/books/${bookId}/counts`, {
        manualCount: data.manualCount,
        countDate: data.countDate,
        systemCount: data.systemCount, // Always pass the original system count
        confirmDiscrepancy: data.confirmDiscrepancy || false,
        setVerified: data.setVerified || false // New parameter to force verified status
      });
      
      // Update the inventory counts in the store
      set((state) => {
        const existingIndex = state.inventoryCounts.findIndex(
          c => c.book_id === bookId && c.count_date === data.countDate
        );
        
        if (existingIndex >= 0) {
          // Update existing count
          const updatedCounts = [...state.inventoryCounts];
          updatedCounts[existingIndex] = count;
          console.log(updatedCounts)
          return { inventoryCounts: updatedCounts, isLoading: false };
        } else {
          console.log(count)
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
}));