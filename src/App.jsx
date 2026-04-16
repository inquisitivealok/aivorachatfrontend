import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { CameraProvider } from './context/CameraContext';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Schedule from './pages/Schedule';
import CameraTracker from './components/CameraTracker';

function AppContent() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1f1f2e',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
          },
          success: { iconTheme: { primary: '#a78bfa', secondary: '#fff' } },
          error: { iconTheme: { primary: '#f87171', secondary: '#fff' } },
        }}
      />
      {/* Floating camera widget — visible on all pages */}
      <CameraTracker />
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <CameraProvider>
          <AppContent />
        </CameraProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
