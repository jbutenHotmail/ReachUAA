import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { UserRole } from '../types';
import { useAuthStore } from '../stores/authStore';
import { useProgramStore } from '../stores/programStore';
import AccessDeniedPage from '../pages/reports/AccessDeniedPage';
import LoadingScreen from '../components/ui/LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectPath?: string;
  requireProgram?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VIEWER],
  redirectPath = '/login',
  requireProgram = true
}) => {
  const location = useLocation();
  const { isAuthenticated, user, isLoading, refreshToken } = useAuthStore();
  const { program, fetchProgram, wasProgramFetched } = useProgramStore();
  
  // Try to refresh token if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      const tryRefresh = async () => {
        try {
          await refreshToken();
        } catch (error) {
          console.error('Token refresh failed:', error);
        }
      };
      
      tryRefresh();
    }
  }, [isAuthenticated, isLoading, refreshToken]);
  
  // Fetch program if authenticated and not already fetched - ONLY FOR ADMIN USERS
  useEffect(() => {
    if (isAuthenticated && !wasProgramFetched && user?.role === UserRole.ADMIN) {
      console.log('Fetching program from ProtectedRoute for ADMIN');
      fetchProgram();
    }
  }, [isAuthenticated, fetchProgram, wasProgramFetched, user]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingScreen message='Loading...' />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }
  
  // If user doesn't have the required role, show access denied page
  if (user && !allowedRoles.includes(user.role)) {
    return <AccessDeniedPage />;
  }
  
  // If program is required but not selected, redirect to program selection
  // Skip this check for the program selection page itself to avoid infinite loop
  // Also skip for non-admin users and setup page
  if (
    requireProgram && 
    !program && 
    !location.pathname.includes('/program-select') && 
    !location.pathname.includes('/setup') && 
    user?.role === UserRole.ADMIN
  ) {
    console.log('No program found, redirecting to program selection');
    return <Navigate to="/program-select" replace />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;