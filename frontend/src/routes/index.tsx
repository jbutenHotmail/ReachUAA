import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useProgramStore } from '../stores/programStore';
import { UserRole } from '../types';

// Route handler for program switching
const ProgramSwitchHandler: React.FC<{ programId: string }> = ({ programId }) => {
  const { switchProgram } = useProgramStore();
  const [error, setError] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    const handleProgramSwitch = async () => {
      try {
        await switchProgram(parseInt(programId));
      } catch (error) {
        setError('Failed to switch program');
        console.error('Error switching program:', error);
      }
    };
    
    handleProgramSwitch();
  }, [programId, switchProgram]);
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-700">{error}</p>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-6 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Switching Program</h1>
        <p className="text-gray-700">Please wait while we switch to the selected program...</p>
        <div className="mt-4 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </div>
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  
  return (
    <Routes>
      {/* Program switch route */}
      <Route path="/program/switch/:programId" element={
        isAuthenticated && user?.role === UserRole.ADMIN ? (
          <ProgramSwitchHandler programId={window.location.pathname.split('/').pop() || ''} />
        ) : (
          <Navigate to="/login" replace />
        )
      } />
      
      {/* All other routes are handled by App.tsx */}
      <Route path="*" element={null} />
    </Routes>
  );
};

export default AppRoutes;