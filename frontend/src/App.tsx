import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useProgramStore } from './stores/programStore';
import ProtectedRoute from './utils/ProtectedRoute';
import { UserRole } from './types';
import Layout from './components/layout/Layout';
import LoadingScreen from './components/ui/LoadingScreen';
import BonificationsPage from './pages/bonifications/BonificationPage';
import SnacksExpenses from './pages/expenses/SnacksExpenses';
import IncentivosExpenses from './pages/expenses/IncentivosExpenses';
import CleaningExpenses from './pages/expenses/CleaningExpenses';
import ActivitiesExpenses from './pages/expenses/ActivitiesExpenses';
import AchievementsPage from './pages/achievements/AchievementsPage';

// Lazy load components
const Login = lazy(() => import('./pages/auth/Login'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const ViewerDashboard = lazy(() => import('./pages/dashboard/ViewerDashboard'));
const InventoryLayout = lazy(() => import('./pages/inventory/InventoryLayout'));
const BookCatalog = lazy(() => import('./pages/inventory/BookCatalog'));
const InventoryTracking = lazy(() => import('./pages/inventory/InventoryTracking'));
const Transactions = lazy(() => import('./pages/transactions/Transactions'));
const TransactionDetails = lazy(() => import('./pages/transactions/TransactionDetails'));
const NewTransaction = lazy(() => import('./pages/transactions/NewTransaction'));
const DeliveredBooks = lazy(() => import('./pages/books/DeliveredBooks'));
const ExpenseLayout = lazy(() => import('./pages/expenses/ExpenseLayout'));
const AllExpenses = lazy(() => import('./pages/expenses/AllExpenses'));
const FoodExpenses = lazy(() => import('./pages/expenses/FoodExpenses'));
const HealthExpenses = lazy(() => import('./pages/expenses/HealthExpenses'));
const SuppliesExpenses = lazy(() => import('./pages/expenses/SuppliesExpenses'));
const MaintenanceExpenses = lazy(() => import('./pages/expenses/MaintenanceExpenses'));
const FuelExpenses = lazy(() => import('./pages/expenses/FuelExpenses'));
const CashAdvanceLayout = lazy(() => import('./pages/cash-advance/CashAdvanceLayout'));
const AdminCashAdvance = lazy(() => import('./pages/cash-advance/AdminCashAdvance'));
const CashAdvanceOverview = lazy(() => import('./pages/cash-advance/CashAdvanceOverview'));
const ChargesPage = lazy(() => import('./pages/charges/ChargesPage'));
const DonationsReport = lazy(() => import('./pages/reports/DonationsReport'));
const ProgramReport = lazy(() => import('./pages/reports/ProgramReport'));
const ColporterReport = lazy(() => import('./pages/reports/ColporterReport'));
const SummerColporterReport = lazy(() => import('./pages/reports/SummerColporterReport'));
const LeaderDetailPage = lazy(() => import('./pages/reports/LeaderDetailPage'));
const IndividualReports = lazy(() => import('./pages/reports/IndividualReports'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const LeaderPercentagesPage = lazy(() => import('./pages/admin/people/LeaderPercentagePage'));
const ColportersPage = lazy(() => import('./pages/admin/people/ColportersPage'));
const LeadersPage = lazy(() => import('./pages/admin/people/LeadersPage'));
const AllPeoplePage = lazy(() => import('./pages/admin/people/AllPeoplePage'));
const UsersPage = lazy(() => import('./pages/admin/users/UsersPage'));
const ProgramSettings = lazy(() => import('./pages/admin/settings/ProgramSettings'));
const ProgramSelectionPage = lazy(() => import('./pages/program/ProgramSelectionPage'));
const ProgramSetup = lazy(() => import('./pages/admin/setup/ProgramSetup'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const AccessDeniedPage = lazy(() => import('./pages/reports/AccessDeniedPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const ChangePasswordPage = lazy(() => import('./pages/profile/ChangePasswordPage'));
const BibleStudiesPage = lazy(() => import('./pages/bible-studies/BibleStudiesPage'));
const BibleStudyDetails = lazy(() => import('./pages/bible-studies/BibleStudyDetails'));
const VersionChecker = lazy(() => import('./components/layout/VersionChecker'));
const DailyReportPage = lazy(() => import('./pages/dashboard/DailyReportPage'));

function App() {
  const { isAuthenticated, user, refreshToken, checkStorageAndLogout } = useAuthStore();
  const { program, fetchProgram, wasProgramFetched, resetStore } = useProgramStore();

  // Check if admin user needs to set up program
  const needsProgramSetup = isAuthenticated && user?.role === UserRole.ADMIN && !program;
  
  // Fetch program data on app load if authenticated and admin
  useEffect(() => {
    // Solo cargar el programa si el usuario es ADMIN y no se ha cargado ya
    if (isAuthenticated && !wasProgramFetched && user?.role === UserRole.ADMIN) {
      fetchProgram();
    }
    
    // Si el usuario no es ADMIN pero hay un programa en localStorage, resetear el store
    if (isAuthenticated && user?.role !== UserRole.ADMIN && program) {
      resetStore();
    }
  }, [isAuthenticated, fetchProgram, wasProgramFetched, user, program, resetStore]);

  // Try to refresh token on app load
  useEffect(() => {
    if (!isAuthenticated) {
      refreshToken().catch(() => {
        // Silent fail - user will be redirected to login if needed
      });
    }
  }, [isAuthenticated, refreshToken]);
  
  // Verificar el localStorage periódicamente para detectar si se ha borrado auth-storage
  useEffect(() => {
    // Verificar inmediatamente al cargar
    checkStorageAndLogout();
    
    // Configurar un intervalo para verificar periódicamente
    const intervalId = setInterval(() => {
      const wasLoggedOut = checkStorageAndLogout();
      if (wasLoggedOut && window.location.pathname !== '/login') {
        // Si se deslogueó y no estamos en la página de login, redirigir
        window.location.href = '/login';
      }
    }, 5000); // Verificar cada 5 segundos
    
    // Verificar también cuando la ventana recupera el foco
    const handleFocus = () => {
      const wasLoggedOut = checkStorageAndLogout();
      if (wasLoggedOut && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleFocus); // Escuchar eventos de almacenamiento
    
    // Limpiar el intervalo y los event listeners cuando el componente se desmonte
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleFocus);
    };
  }, [checkStorageAndLogout]);

  return (
    <>
      {/* Componente para verificar actualizaciones */}
      <Suspense fallback={null}>
        <VersionChecker />
      </Suspense>
      
      <Routes>
        <Route 
          path="/login" 
          element={
            <Suspense fallback={<LoadingScreen message="Loading..." />}>
              {!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />}
            </Suspense>
          } 
        />
        
        {/* Program Selection Page */}
        <Route 
          path="/program-select" 
          element={
            <ProtectedRoute requireProgram={false}>
              <Suspense fallback={<LoadingScreen message="Loading program selection..." />}>
                <ProgramSelectionPage />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        
        {/* Program Setup Route for Admin */}
        <Route 
          path="/setup" 
          element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]} requireProgram={false}>
              <Suspense fallback={<LoadingScreen message="Loading program setup..." />}>
                <ProgramSetup />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/" 
          element={
            <ProtectedRoute requireProgram={user?.role === UserRole.ADMIN}>
              {needsProgramSetup && user?.role === UserRole.ADMIN ? (
                <Navigate to="/setup" replace />
              ) : !program && user?.role === UserRole.ADMIN ? (
                <Navigate to="/program-select" replace />
              ) : (
                <Layout />
              )}
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          {/* Dashboard - Different view for Viewer role */}
          <Route path="dashboard" element={
            <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
              {user?.role === UserRole.VIEWER ? <ViewerDashboard /> : <Dashboard />}
            </Suspense>
          } />
          
          {/* Inventory - Restricted for Viewer role */}
          <Route path="inventory" element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <Suspense fallback={<LoadingScreen message="Loading inventory..." />}>
                <InventoryLayout />
              </Suspense>
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="catalog" replace />} />
            <Route path="catalog" element={<Suspense fallback={<LoadingScreen />}><BookCatalog /></Suspense>} />
            <Route path="tracking" element={<Suspense fallback={<LoadingScreen />}><InventoryTracking /></Suspense>} />
          </Route>
          
          {/* Transactions - Viewer can only create new transactions */}
          <Route path="transactions">
            <Route index element={<Navigate to="/transactions/finances" replace />} />
            <Route path="finances" element={
              <Suspense fallback={<LoadingScreen message="Loading transactions..." />}>
                {user?.role === UserRole.VIEWER ? 
                  <AccessDeniedPage message="You don't have permission to view transactions. You can only create new transactions." /> : 
                  <Transactions />
                }
              </Suspense>
            } />
            <Route path="delivered-books" element={
              <Suspense fallback={<LoadingScreen message="Loading delivered books..." />}>
                {user?.role === UserRole.VIEWER ? 
                  <AccessDeniedPage message="You don't have permission to view delivered books. You can only create new transactions." /> : 
                  <Transactions />
                }
              </Suspense>
            } />
            <Route path="new" element={
              <Suspense fallback={<LoadingScreen message="Loading transaction form..." />}>
                {user?.role === UserRole.VIEWER ? 
                  <AccessDeniedPage message="This feature is currently not available for your role." /> : 
                  <NewTransaction />
                }
              </Suspense>
            } />
            <Route path=":id" element={
              <Suspense fallback={<LoadingScreen message="Loading transaction details..." />}>
                {user?.role === UserRole.VIEWER ? 
                  <AccessDeniedPage message="You don't have permission to view transaction details." /> : 
                  <TransactionDetails />
                }
              </Suspense>
            } />
          </Route>

          {/* Delivered Books - Restricted for Viewer role */}
          <Route path="delivered-books" element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <Suspense fallback={<LoadingScreen message="Loading delivered books..." />}>
                <DeliveredBooks />
              </Suspense>
            </ProtectedRoute>
          } />
          
          {/* Expenses - Restricted for Viewer role */}
          <Route path="expenses" element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <Suspense fallback={<LoadingScreen message="Loading expenses..." />}>
                <ExpenseLayout />
              </Suspense>
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/expenses/all" replace />} />
            <Route path="all" element={<Suspense fallback={<LoadingScreen />}><AllExpenses /></Suspense>} />
            <Route path="food" element={<Suspense fallback={<LoadingScreen />}><FoodExpenses /></Suspense>} />
            <Route path="health" element={<Suspense fallback={<LoadingScreen />}><HealthExpenses /></Suspense>} />
            <Route path="supplies" element={<Suspense fallback={<LoadingScreen />}><SuppliesExpenses /></Suspense>} />
            <Route path="maintenance" element={<Suspense fallback={<LoadingScreen />}><MaintenanceExpenses /></Suspense>} />
            <Route path="fuel" element={<Suspense fallback={<LoadingScreen />}><FuelExpenses /></Suspense>} />
            <Route path="snacks" element={<Suspense fallback={<LoadingScreen />}><SnacksExpenses /></Suspense>} />
            <Route path="incentives" element={<Suspense fallback={<LoadingScreen />}><IncentivosExpenses /></Suspense>} />
            <Route path="cleaning" element={<Suspense fallback={<LoadingScreen />}><CleaningExpenses /></Suspense>} />
            <Route path="activities" element={<Suspense fallback={<LoadingScreen />}><ActivitiesExpenses /></Suspense>} />
          </Route>

          {/* Cash Advance - Restricted for Viewer role */}
          <Route 
            path="cash-advance" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
                <Suspense fallback={<LoadingScreen message="Loading cash advances..." />}>
                  <CashAdvanceLayout />
                </Suspense>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<Suspense fallback={<LoadingScreen />}><CashAdvanceOverview /></Suspense>} />
            <Route path="new" element={<Suspense fallback={<LoadingScreen />}><AdminCashAdvance /></Suspense>} />
          </Route>
            {/* Achievements - Restricted for Viewer role */}
            <Route 
              path="achievements" 
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
                  <Suspense fallback={<LoadingScreen message="Loading achievements..." />}>
                    <AchievementsPage />
                  </Suspense>
                </ProtectedRoute>
              }
              />
              
          {/* Charges - Restricted for Viewer role */}
          <Route 
            path="charges" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
                <Suspense fallback={<LoadingScreen message="Loading charges..." />}>
                  <ChargesPage />
                </Suspense>
              </ProtectedRoute>
            } 
          />

          {/* Bible Studies - All authenticated users can access */}
          <Route path="bible-studies">
            <Route index element={
              <Suspense fallback={<LoadingScreen message="Loading bible studies..." />}>
                <BibleStudiesPage />
              </Suspense>
            } />
            <Route path=":id" element={
              <Suspense fallback={<LoadingScreen message="Loading bible study details..." />}>
                <BibleStudyDetails />
              </Suspense>
            } />
          </Route>

          {/* Bonifications - All authenticated users can access */}
          <Route path="bonifications" element={
            <Suspense fallback={<LoadingScreen message="Loading bonifications..." />}>
              <BonificationsPage />
            </Suspense>
          } />

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
                  <Suspense fallback={<LoadingScreen />}>
                    <AccessDeniedPage />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Redirect non-ADMIN to access denied */}
            <Route 
              path="donations/*" 
              element={
                user?.role === UserRole.ADMIN ? (
                  <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                    <Suspense fallback={<LoadingScreen message="Loading donations report..." />}>
                      <DonationsReport />
                    </Suspense>
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
                    <Suspense fallback={<LoadingScreen message="Loading program report..." />}>
                      <ProgramReport />
                    </Suspense>
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
                    <Suspense fallback={<LoadingScreen message="Loading individual reports..." />}>
                      <IndividualReports />
                    </Suspense>
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
                    <Suspense fallback={<LoadingScreen message="Loading colporter report..." />}>
                      <ColporterReport />
                    </Suspense>
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
                    <Suspense fallback={<LoadingScreen message="Loading colporter report..." />}>
                      <SummerColporterReport />
                    </Suspense>
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
                    <Suspense fallback={<LoadingScreen message="Loading leader report..." />}>
                      <LeaderDetailPage />
                    </Suspense>
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
                <Suspense fallback={<LoadingScreen message="Loading admin panel..." />}>
                  <AdminLayout />
                </Suspense>
              </ProtectedRoute>
            }
          >
            <Route path="users">
              <Route index element={<Navigate to="manage" replace />} />
              <Route path="manage" element={<Suspense fallback={<LoadingScreen />}><UsersPage /></Suspense>} />
              <Route path="roles" element={<Suspense fallback={<LoadingScreen />}><AccessDeniedPage /></Suspense>} />
            </Route>
            <Route path="people">
              <Route index element={<Navigate to="all" replace />} />
              <Route path="all" element={<Suspense fallback={<LoadingScreen />}><AllPeoplePage /></Suspense>} />
              <Route path="colporters" element={<Suspense fallback={<LoadingScreen />}><ColportersPage /></Suspense>} />
              <Route path="leaders" element={<Suspense fallback={<LoadingScreen />}><LeadersPage /></Suspense>} />
            </Route>
            <Route path="percentages" element={<Suspense fallback={<LoadingScreen />}><LeaderPercentagesPage /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<LoadingScreen />}><ProgramSettings /></Suspense>} />
            <Route path="programs" element={<Suspense fallback={<LoadingScreen />}><ProgramSelectionPage /></Suspense>} />
          </Route>
          
          <Route path="profile" element={
            <Suspense fallback={<LoadingScreen message="Loading profile..." />}>
              <ProfilePage />
            </Suspense>
          } />
          <Route path="change-password" element={
            <Suspense fallback={<LoadingScreen message="Loading..." />}>
              <ChangePasswordPage />
            </Suspense>
          } />
          <Route path="settings" element={
            <Suspense fallback={<LoadingScreen message="Loading settings..." />}>
              <SettingsPage />
            </Suspense>
          } />
          <Route path="daily-report/:date" element={
            <Suspense fallback={<LoadingScreen message="Loading daily report..." />}>
              <DailyReportPage />
            </Suspense>
          } />
        </Route>
      </Routes>
    </>
  );
}

export default App;