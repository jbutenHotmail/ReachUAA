import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { UserRole } from '../types';
import { useAuthStore } from '../stores/authStore';
import AccessDeniedPage from '../pages/reports/AccessDeniedPage';
import LoadingScreen from '../components/ui/LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VIEWER],
  redirectPath = '/login'
}) => {
  const location = useLocation();
  const { isAuthenticated, user, isLoading, refreshToken } = useAuthStore();
  
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
  
  return <>{children}</>;
};

export default ProtectedRoute;