import { useState, useEffect, useCallback } from 'react';
import * as programService from '../services/programService';

interface UseProgramReturn {
  program: any | null;
  hasProgram: boolean;
  isLoading: boolean;
  error: string | null;
  createProgram: (programData: any) => Promise<void>;
  updateProgram: (id: string, programData: any) => Promise<void>;
  fetchProgram: () => Promise<void>;
}

export const useProgram = (): UseProgramReturn => {
  const [program, setProgram] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgram = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await programService.getProgram();
      setProgram(response);
    } catch (error) {
      console.error('Error fetching program:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgram();
  }, [fetchProgram]);

  const createProgram = useCallback(async (programData: any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await programService.createProgram(programData);
      await fetchProgram();
    } catch (error) {
      console.error('Error creating program:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchProgram]);

  const updateProgram = useCallback(async (id: string, programData: any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await programService.updateProgram(id, programData);
      await fetchProgram();
    } catch (error) {
      console.error('Error updating program:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchProgram]);

  return {
    program,
    hasProgram: !!program,
    isLoading,
    error,
    createProgram,
    updateProgram,
    fetchProgram,
  };
};

export default useProgram;