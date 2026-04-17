// Top-level component responsible for authentication gating, route composition, and hoisted document state.
// Keeping shared state at this level avoids prop drilling through multiple intermediate components and prevents duplicate network requests across tabs.

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import api from './utils/api';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import QuizView from './components/QuizView';
import FilesView from './components/FilesView';
import HistoryView from './components/HistoryView';
import QuizReview from './components/QuizReview';
import AnalyticsView from './components/AnalyticsView';
import SettingsView from './components/SettingsView';

// AppContent is the authenticated shell. It derives the current tab from the URL so the sidebar highlighting remains correct on browser back/forward navigation.
function AppContent({ onLogout, documents, onUpload, onDelete, userEmail, documentsLoaded }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavbarOpen, setIsNavbarOpen] = useState(false);

  // The active tab is derived from the route prefix rather than stored in state, which keeps the URL as the single source of truth.
  const activeTab = location.pathname.startsWith('/history') ? 'quiz'
    : location.pathname.startsWith('/quiz') ? 'quiz'
    : location.pathname.startsWith('/review') ? 'quiz'
    : location.pathname.startsWith('/files') ? 'files'
    : location.pathname.startsWith('/feedback') ? 'feedback'
    : location.pathname.startsWith('/settings') ? 'settings'
    : 'dashboard';

  const handleNavigate = (tab) => {
    if (tab === 'dashboard') navigate('/');
    else if (tab === 'quiz') navigate('/history');
    else if (tab === 'files') navigate('/files');
    else if (tab === 'feedback') navigate('/feedback');
    else if (tab === 'settings') navigate('/settings');
    setIsNavbarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Navbar
        isOpen={isNavbarOpen}
        onClose={() => setIsNavbarOpen(false)}
        activeTab={activeTab}
        onNavigate={handleNavigate}
        onLogout={onLogout}
      />
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center sticky top-0 z-30">
        <button
          onClick={() => setIsNavbarOpen(true)}
          className="p-2 -ml-2 mr-4 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="font-bold text-xl text-blue-900 tracking-tight">CourseMatic</div>
      </nav>
      <main className="w-full">
        <Routes>
          <Route path="/" element={
            <Dashboard onUpload={onUpload} documents={documents} onDelete={onDelete} documentsLoaded={documentsLoaded} />
          } />
          <Route path="/quiz/:quizId" element={<QuizView />} />
          <Route path="/files" element={<FilesView onUpload={onUpload} documents={documents} onDelete={onDelete} />} />
          <Route path="/history" element={<HistoryView />} />
          <Route path="/review/:attemptId" element={<QuizReview />} />
          <Route path="/feedback" element={<AnalyticsView />} />
          <Route path="/settings" element={<SettingsView email={userEmail} />} />
          {/* Unknown routes fall back to the dashboard rather than rendering an error page. */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  // documents state is hoisted to the App level so both FilesView and Dashboard read from the same source without duplicate API calls.
  const [documents, setDocuments] = useState([]);
  // documentsLoaded distinguishes "still loading" from "loaded but empty", which drives the empty-state CTA on the Dashboard.
  const [documentsLoaded, setDocumentsLoaded] = useState(false);

  const handleLogin = (email) => {
    setUserEmail(email);
    setIsLoggedIn(true);
    // Documents are fetched immediately after login so the Dashboard has data by the time it mounts.
    fetchDocuments();
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserEmail('');
    // Removing the token invalidates all subsequent requests on this browser session.
    localStorage.removeItem('token');
  };

  const fetchDocuments = async () => {
    try {
      const { data } = await api.get('/documents');
      setDocuments(data);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      // documentsLoaded is set in the finally block so the empty-state CTA still renders correctly even if the request fails.
      setDocumentsLoaded(true);
    }
  };

  const handleDeleteDocument = async (docId) => {
    // A native confirm dialog is used rather than a modal to keep the dependency surface small for what is a destructive but infrequent action.
    const isConfirmed = window.confirm("Are you sure you want to delete this file?");
    if (!isConfirmed) return;
    try {
      await api.delete(`/documents/${docId}`);
      // Local state is updated after the backend confirms deletion so the UI never shows a ghost file if the network request fails.
      setDocuments(documents.filter(doc => doc.id !== docId));
    } catch (error) {
      alert("Failed to delete file.");
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    // FormData is required for multipart uploads; axios automatically sets the correct Content-Type header with boundary when passed a FormData object.
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/upload', formData);
      alert(`File "${file.name}" uploaded successfully!`);
      // The document list is re-fetched rather than optimistically updated so the frontend receives the server-assigned id.
      fetchDocuments();
    } catch (error) {
      alert('Upload failed: ' + (error.response?.data?.detail || 'Unknown error'));
    }
    // Resetting the input value allows the same file to be re-uploaded immediately if the user wants to retry.
    event.target.value = null;
  };

  // The Login screen is rendered outside the BrowserRouter so unauthenticated users cannot manually navigate to protected routes by editing the URL.
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <AppContent
        onLogout={handleLogout}
        documents={documents}
        onUpload={handleFileUpload}
        onDelete={handleDeleteDocument}
        userEmail={userEmail}
        documentsLoaded={documentsLoaded}
      />
    </BrowserRouter>
  );
}

export default App;
