import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { UserRole } from '../types';
import { useAuthStore } from '../stores/authStore';
import Spinner from '../components/ui/Spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VIEWER]
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
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;