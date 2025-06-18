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
import ProgramSetup from './pages/admin/setup/ProgramSetup';
import ProfilePage from './pages/profile/ProfilePage';
import AccessDeniedPage from './pages/reports/AccessDeniedPage';
import ViewerDashboard from './pages/dashboard/ViewerDashboard';
import SettingsPage from './pages/settings/SettingsPage';
import { useSettingsStore } from './stores/settingsStore';

function App() {
  const { isAuthenticated, user, refreshToken } = useAuthStore();
  const { program, fetchProgram } = useProgramStore();
  const { settings } = useSettingsStore();

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
            <ProgramSetup />
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
        
        {/* Dashboard - Different view for Viewer role */}
        <Route path="dashboard" element={
          user?.role === UserRole.VIEWER ? <ViewerDashboard /> : <Dashboard />
        } />
        
        {/* Inventory - Restricted for Viewer role */}
        <Route path="inventory" element={
          <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
            <InventoryLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="catalog" replace />} />
          <Route path="catalog" element={<BookCatalog />} />
          <Route path="tracking" element={<InventoryTracking />} />
        </Route>
        
        {/* Transactions - Viewer can only create new transactions */}
        <Route path="transactions">
          <Route index element={<Navigate to="/transactions/finances" replace />} />
          <Route path="finances" element={
            user?.role === UserRole.VIEWER ? 
              <AccessDeniedPage message="You don't have permission to view transactions. You can only create new transactions." /> : 
              <Transactions />
          } />
          <Route path="delivered-books" element={
            user?.role === UserRole.VIEWER ? 
              <AccessDeniedPage message="You don't have permission to view delivered books. You can only create new transactions." /> : 
              <Transactions />
          } />
          <Route path="new" element={user?.role === UserRole.VIEWER ? 
              <AccessDeniedPage message="You don't have permission to view transactions. You can only create new transactions." /> : 
              <NewTransaction />} />
          <Route path=":id" element={
            user?.role === UserRole.VIEWER ? 
              <AccessDeniedPage message="You don't have permission to view transaction details." /> : 
              <TransactionDetails />
          } />
        </Route>

        {/* Delivered Books - Restricted for Viewer role */}
        <Route path="delivered-books" element={
          <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
            <DeliveredBooks />
          </ProtectedRoute>
        } />
        
        {/* Expenses - Restricted for Viewer role */}
        <Route path="expenses" element={
          <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
            <ExpenseLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/expenses/all" replace />} />
          <Route path="all" element={<AllExpenses />} />
          <Route path="food" element={<FoodExpenses />} />
          <Route path="health" element={<HealthExpenses />} />
          <Route path="supplies" element={<SuppliesExpenses />} />
          <Route path="maintenance" element={<MaintenanceExpenses />} />
          <Route path="fuel" element={<FuelExpenses />} />
        </Route>

        {/* Cash Advance - Restricted for Viewer role */}
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

        {/* Charges - Restricted for Viewer role */}
        <Route 
          path="charges" 
          element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <ChargesPage />
            </ProtectedRoute>
          } 
        />

        <Route path="reports">
          {/* Access control for reports - only ADMIN can access reports */}
          <Route 
            index 
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <Navigate to="/reports/donations/finances" replace />
              </ProtectedRoute>
            } 
          />
          
          {/* For SUPERVISOR and VIEWER, show access denied page */}
          <Route 
            path="access-denied" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.SUPERVISOR, UserRole.VIEWER]}>
                <AccessDeniedPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Redirect non-ADMIN to access denied */}
          <Route 
            path="donations/*" 
            element={
              user?.role === UserRole.ADMIN ? (
                <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                  <DonationsReport />
                </ProtectedRoute>
              ) : (
                <Navigate to="/reports/access-denied" replace />
              )
            } 
          />
          
          <Route 
            path="program" 
            element={
              user?.role === UserRole.ADMIN ? (
                <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                  <ProgramReport />
                </ProtectedRoute>
              ) : (
                <Navigate to="/reports/access-denied" replace />
              )
            } 
          />
          
          <Route 
            path="individual" 
            element={
              user?.role === UserRole.ADMIN ? (
                <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                  <IndividualReports />
                </ProtectedRoute>
              ) : (
                <Navigate to="/reports/access-denied" replace />
              )
            } 
          />
          
          <Route 
            path="colporter/:name" 
            element={
              user?.role === UserRole.ADMIN ? (
                <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                  <ColporterReport />
                </ProtectedRoute>
              ) : (
                <Navigate to="/reports/access-denied" replace />
              )
            } 
          />
          
          <Route 
            path="summer-colporter/:name" 
            element={
              user?.role === UserRole.ADMIN ? (
                <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                  <SummerColporterReport />
                </ProtectedRoute>
              ) : (
                <Navigate to="/reports/access-denied" replace />
              )
            } 
          />
          
          <Route 
            path="leader/:name" 
            element={
              user?.role === UserRole.ADMIN ? (
                <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                  <LeaderDetailPage />
                </ProtectedRoute>
              ) : (
                <Navigate to="/reports/access-denied" replace />
              )
            } 
          />
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
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;