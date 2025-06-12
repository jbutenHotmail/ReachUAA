import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useProgramStore } from './stores/programStore';
import ProtectedRoute from './utils/ProtectedRoute';
import { UserRole } from './types';

import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import InventoryLayout from './pages/inventory/InventoryLayout';
import BookCatalog from './pages/inventory/BookCatalog';
import InventoryTracking from './pages/inventory/InventoryTracking';
import Transactions from './pages/transactions/Transactions';
import TransactionDetails from './pages/transactions/TransactionDetails';
import NewTransaction from './pages/transactions/NewTransaction';
import DeliveredBooks from './pages/books/DeliveredBooks';
import ExpenseLayout from './pages/expenses/ExpenseLayout';
import AllExpenses from './pages/expenses/AllExpenses';
import FoodExpenses from './pages/expenses/FoodExpenses';
import HealthExpenses from './pages/expenses/HealthExpenses';
import SuppliesExpenses from './pages/expenses/SuppliesExpenses';
import MaintenanceExpenses from './pages/expenses/MaintenanceExpenses';
import FuelExpenses from './pages/expenses/FuelExpenses';
import CashAdvanceLayout from './pages/cash-advance/CashAdvanceLayout';
import AdminCashAdvance from './pages/cash-advance/AdminCashAdvance';
import CashAdvanceOverview from './pages/cash-advance/CashAdvanceOverview';
import ChargesPage from './pages/charges/ChargesPage';
import DonationsReport from './pages/reports/DonationsReport';
import ProgramReport from './pages/reports/ProgramReport';
import ColporterReport from './pages/reports/ColporterReport';
import SummerColporterReport from './pages/reports/SummerColporterReport';
import LeaderDetailPage from './pages/reports/LeaderDetailPage';
import IndividualReports from './pages/reports/IndividualReports';
import AdminLayout from './pages/admin/AdminLayout';
import ColportersPage from './pages/admin/people/ColportersPage';
import LeadersPage from './pages/admin/people/LeadersPage';
import AllPeoplePage from './pages/admin/people/AllPeoplePage';
import UsersPage from './pages/admin/users/UsersPage';
import ManageRolesPage from './pages/admin/users/ManageRolesPage';
import ProgramSettings from './pages/admin/settings/ProgramSettings';
import ProfilePage from './pages/profile/ProfilePage';
import ProgramSetup from './pages/admin/setup/ProgramSetup';

function App() {
  const { isAuthenticated, user, refreshToken } = useAuthStore();
  const { program, fetchProgram } = useProgramStore();

  // Check if admin user needs to set up program
  const needsProgramSetup = isAuthenticated && user?.role === UserRole.ADMIN && !program;
  // Fetch program data on app load if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchProgram();
    }
  }, [isAuthenticated, fetchProgram]);

  // Try to refresh token on app load
  useEffect(() => {
    if (!isAuthenticated) {
      refreshToken().catch(() => {
        // Silent fail - user will be redirected to login if needed
      });
    }
  }, [isAuthenticated, refreshToken]);

  return (
    <Routes>
      <Route 
        path="/login" 
        element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} 
      />
      
      {/* Program Setup Route for Admin */}
      <Route 
        path="/setup" 
        element={
          <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
             {needsProgramSetup ? (
              <ProgramSetup />
            ) : (
              <Navigate to="/dashboard" replace />
            )}
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            {needsProgramSetup ? (
              <Navigate to="/setup" replace />
            ) : (
              <Layout />
            )}
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        
        <Route path="inventory" element={<InventoryLayout />}>
          <Route index element={<Navigate to="catalog" replace />} />
          <Route path="catalog" element={<BookCatalog />} />
          <Route path="tracking" element={<InventoryTracking />} />
        </Route>
        
        <Route path="transactions">
          <Route index element={<Navigate to="/transactions/finances" replace />} />
          <Route path="finances" element={<Transactions />} />
          <Route path="delivered-books" element={<Transactions />} />
          <Route path="new" element={<NewTransaction />} />
          <Route path=":id" element={<TransactionDetails />} />
        </Route>

        <Route path="delivered-books" element={<DeliveredBooks />} />
        
        <Route path="expenses" element={<ExpenseLayout />}>
          <Route index element={<Navigate to="/expenses/all" replace />} />
          <Route path="all" element={<AllExpenses />} />
          <Route path="food" element={<FoodExpenses />} />
          <Route path="health" element={<HealthExpenses />} />
          <Route path="supplies" element={<SuppliesExpenses />} />
          <Route path="maintenance" element={<MaintenanceExpenses />} />
          <Route path="fuel" element={<FuelExpenses />} />
        </Route>

        <Route 
          path="cash-advance" 
          element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <CashAdvanceLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<CashAdvanceOverview />} />
          <Route path="new" element={<AdminCashAdvance />} />
        </Route>

        <Route 
          path="charges" 
          element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <ChargesPage />
            </ProtectedRoute>
          } 
        />

        <Route path="reports">
          <Route path="donations">
            <Route path="finances" element={<DonationsReport />} />
            <Route path="delivered-books" element={<DonationsReport />} />
          </Route>
          <Route path="program" element={<ProgramReport />} />
          <Route path="individual" element={<IndividualReports />} />
          <Route path="colporter/:name" element={<ColporterReport />} />
          <Route path="summer-colporter/:name" element={<SummerColporterReport />} />
          <Route path="leader/:name" element={<LeaderDetailPage />} />
        </Route>

        <Route 
          path="admin" 
          element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="users">
            <Route index element={<Navigate to="manage" replace />} />
            <Route path="manage" element={<UsersPage />} />
            <Route path="roles" element={<ManageRolesPage />} />
          </Route>
          <Route path="people">
            <Route index element={<Navigate to="all" replace />} />
            <Route path="all" element={<AllPeoplePage />} />
            <Route path="colporters" element={<ColportersPage />} />
            <Route path="leaders" element={<LeadersPage />} />
          </Route>
          <Route path="settings" element={<ProgramSettings />} />
        </Route>
        
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}

export default App;