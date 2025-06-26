import { create } from "zustand";
import { User, UserRole, Person } from "../types";
import { api } from "../api";
import { useProgramStore } from "./programStore";

interface UserState {
  users: User[];
  people: Person[];
  isLoading: boolean;
  error: string | null;
  werePeopleFetched: boolean;
  wereUsersFetched: boolean;
  setWerePeopleFetched: (value: boolean) => void;
}

interface UserStore extends UserState {
  fetchUsers: () => Promise<void>;
  fetchPeople: (programId?: number) => Promise<void>;
  getLeaders: (programId?: number) => Person[];
  getColporters: (programId?: number) => Person[];
  createUser: (userData: any) => Promise<void>;
  updateUser: (id: string, userData: any) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
  getRolePermissions: () => Promise<any[]>;
  updateRolePermissions: (permissions: any[]) => Promise<void>;
  createPerson: (personData: Partial<Person>) => Promise<Person>;
  updatePerson: (id: string, personData: Partial<Person>) => Promise<Person>;
  deletePerson: (
    id: string,
    personType: "COLPORTER" | "LEADER"
  ) => Promise<void>;
  resetStore: () => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
  users: [],
  people: [],
  isLoading: false,
  error: null,
  werePeopleFetched: false,
  wereUsersFetched: false,
  setWerePeopleFetched: (value: boolean) => set({ werePeopleFetched: value }),

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const params: Record<string, string | number> = {};
      const { program } = useProgramStore.getState();

      if (program) {
        params.programId = program?.id;
      } else {
        throw new Error("Program not found");
      }

      const users = await api.get<User[]>("/users", { params });
      set({ users, isLoading: false, wereUsersFetched: true });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
        isLoading: false,
      });
    }
  },

  fetchPeople: async (programId) => {
    set({ isLoading: true, error: null });
    try {
      const params: Record<string, string | number> = {};
      const { program } = useProgramStore.getState();

      if (programId) {
        params.programId = programId;
      } else {
        program && (params.programId = program?.id);
      }

      const people = await api.get<Person[]>("/people", { params });
      set({ people, isLoading: false, werePeopleFetched: true });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
        isLoading: false,
      });
    }
  },

  getLeaders: (programId) => {
    const people = get().people;
    return people.filter((person) => {
      const matchesType = person.personType === "LEADER";
      const matchesProgram = !programId || person.programId === programId;
      return matchesType && matchesProgram;
    });
  },

  getColporters: (programId) => {
    const people = get().people;
    return people.filter((person) => {
      const matchesType = person.personType === "COLPORTER";
      const matchesProgram = !programId || person.programId === programId;
      return matchesType && matchesProgram;
    });
  },

  createUser: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const newUser = await api.post<User>("/users", userData);
      set((state) => ({
        users: [...state.users, newUser],
        isLoading: false,
      }));
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
        isLoading: false,
      });
      throw error;
    }
  },

  updateUser: async (id, userData) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await api.put<User>(`/users/${id}`, userData);
      set((state) => ({
        users: state.users.map((user) => (user.id === id ? updatedUser : user)),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
        isLoading: false,
      });
      throw error;
    }
  },

  deleteUser: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/users/${id}`);
      set((state) => ({
        users: state.users.filter((user) => user.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
        isLoading: false,
      });
      throw error;
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    set({ isLoading: true, error: null });
    try {
      await api.post("/users/change-password", {
        currentPassword,
        newPassword,
      });
      set({ isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
        isLoading: false,
      });
      throw error;
    }
  },

  getRolePermissions: async () => {
    set({ isLoading: true, error: null });
    try {
      const permissions = await api.get<any[]>("/users/roles/permissions");
      set({ isLoading: false });
      return permissions;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
        isLoading: false,
      });
      throw error;
    }
  },

  updateRolePermissions: async (permissions) => {
    set({ isLoading: true, error: null });
    try {
      await api.put("/users/roles/permissions", { permissions });
      set({ isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
        isLoading: false,
      });
      throw error;
    }
  },

  // New methods for person management
  createPerson: async (personData) => {
    set({ isLoading: true, error: null });
    try {
      let newPerson;

      if (personData.personType === "COLPORTER") {
        newPerson = await api.post<Person>("/people/colporters", personData);
      } else {
        newPerson = await api.post<Person>("/people/leaders", personData);
      }

      set((state) => ({
        people: [...state.people, newPerson],
        isLoading: false,
      }));

      return newPerson;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
        isLoading: false,
      });
      throw error;
    }
  },

  updatePerson: async (id, personData) => {
    set({ isLoading: true, error: null });
    try {
      let updatedPerson;

      if (personData.personType === "COLPORTER") {
        updatedPerson = await api.put<Person>(
          `/people/colporters/${id}`,
          personData
        );
      } else {
        updatedPerson = await api.put<Person>(
          `/people/leaders/${id}`,
          personData
        );
      }

      set((state) => ({
        people: state.people.map((person) =>
          person.id === id ? updatedPerson : person
        ),
        isLoading: false,
      }));

      return updatedPerson;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
        isLoading: false,
      });
      throw error;
    }
  },

  deletePerson: async (id, personType) => {
    set({ isLoading: true, error: null });
    try {
      if (personType === "COLPORTER") {
        await api.delete(`/people/colporters/${id}`);
      } else {
        await api.delete(`/people/leaders/${id}`);
      }

      set((state) => ({
        people: state.people.filter((person) => person.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
        isLoading: false,
      });
      throw error;
    }
  },
  resetStore: () => {
    set({
      people: [],
      isLoading: false,
      error: null,
      werePeopleFetched: false,
    });
  },
}));
