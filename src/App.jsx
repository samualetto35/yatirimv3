import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useEffect } from 'react';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Leaders from './pages/Leaders';
import History from './pages/History';
import Market from './pages/Market';
import Announcements from './pages/Announcements';
import Profile from './pages/Profile';
import VerifyEmail from './pages/VerifyEmail';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import AdminLogs from './pages/AdminLogs';
import AdminActions from './pages/AdminActions';
import AdminUsers from './pages/AdminUsers';
// DB introspection utility intentionally not auto-run to avoid permission issues

function App() {
  // Removed automatic DB introspection to prevent permission errors

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/portfolio"
            element={
              <ProtectedRoute>
                <Portfolio />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/leaderboard"
            element={
              <ProtectedRoute>
                <Leaders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/announcements"
            element={
              <ProtectedRoute>
                <Announcements />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/market"
            element={
              <ProtectedRoute>
                <Market />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <AdminRoute>
                <AdminLogs />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/actions"
            element={
              <AdminRoute>
                <AdminActions />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminUsers />
              </AdminRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </AuthProvider>
    </Router>
  );
}

export default App;
