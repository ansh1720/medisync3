import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { InteractionProvider } from './context/InteractionContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleBasedRedirect from './components/RoleBasedRedirect';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard'));
const RiskAssessment = lazy(() => import('./pages/RiskAssessment'));
const EquipmentReadings = lazy(() => import('./pages/EquipmentReadings'));
const HospitalLocator = lazy(() => import('./pages/HospitalLocator'));
const DoctorDiscovery = lazy(() => import('./pages/DoctorDiscovery'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const ConsultationRoom = lazy(() => import('./pages/ConsultationRoom'));
const ConsultationHistory = lazy(() => import('./pages/ConsultationHistory'));
const CommunityForum = lazy(() => import('./pages/CommunityForum'));
const HealthNews = lazy(() => import('./pages/HealthNews'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const EnhancedDiseaseSearch = lazy(() => import('./pages/EnhancedDiseaseSearch'));
const EnhancedDiseaseDetails = lazy(() => import('./pages/EnhancedDiseaseDetails'));
const Prescriptions = lazy(() => import('./pages/Prescriptions'));
const DoctorPatients = lazy(() => import('./pages/DoctorPatients'));
const DoctorVerification = lazy(() => import('./pages/DoctorVerification'));
const AdminVerifications = lazy(() => import('./pages/AdminVerifications'));

// Handle pending route redirects from GitHub Pages 404.html
function RouteHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const pendingRoute = sessionStorage.getItem('pendingRoute');
    if (pendingRoute) {
      sessionStorage.removeItem('pendingRoute');
      navigate(pendingRoute, { replace: true });
    }
  }, [navigate]);

  return null;
}

function App() {
  return (
    <AuthProvider>
      <InteractionProvider>
        <Router basename="/medisync2">
          <div className="App">
            <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                theme: {
                  primary: '#4aed88',
                },
              },
            }}
          />
          
          <RouteHandler />
          
          <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0f172a', color: '#38bdf8' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: '500' }}>Loading MediSync...</div>
            </div>
          }>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/verifications"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminVerifications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['doctor']}>
                    <DoctorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor/patients"
                element={
                  <ProtectedRoute allowedRoles={['doctor']}>
                    <DoctorPatients />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor/verification"
                element={
                  <ProtectedRoute allowedRoles={['doctor']}>
                    <DoctorVerification />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/risk-assessment"
                element={
                  <ProtectedRoute>
                    <RiskAssessment />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/equipment"
                element={
                  <ProtectedRoute>
                    <EquipmentReadings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hospitals"
                element={
                  <ProtectedRoute>
                    <HospitalLocator />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/consultations"
                element={
                  <ProtectedRoute>
                    <DoctorDiscovery />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/consultation/book/:doctorId"
                element={
                  <ProtectedRoute>
                    <BookingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/consultation/history"
                element={
                  <ProtectedRoute>
                    <ConsultationHistory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/consultation/room/:consultationId"
                element={
                  <ProtectedRoute>
                    <ConsultationRoom />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/forum"
                element={
                  <ProtectedRoute>
                    <CommunityForum />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/news"
                element={
                  <ProtectedRoute>
                    <HealthNews />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <UserProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/diseases"
                element={
                  <ProtectedRoute>
                    <EnhancedDiseaseSearch />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/diseases/details/:name"
                element={
                  <ProtectedRoute>
                    <EnhancedDiseaseDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/prescriptions"
                element={
                  <ProtectedRoute>
                    <Prescriptions />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<RoleBasedRedirect />} />
              <Route path="*" element={<RoleBasedRedirect />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
      </InteractionProvider>
    </AuthProvider>
  );
}

export default App;
