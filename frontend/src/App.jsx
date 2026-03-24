import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import api from './utils/api';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import QuizView from './components/QuizView';

function AppContent({ onLogout, documents, onUpload, onDelete }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavbarOpen, setIsNavbarOpen] = useState(false);

  const activeTab = location.pathname.startsWith('/quiz') ? 'quiz'
    : location.pathname.startsWith('/feedback') ? 'feedback'
    : 'dashboard';

  const handleNavigate = (tab) => {
    if (tab === 'dashboard') navigate('/');
    else if (tab === 'quiz') navigate('/quiz');
    else if (tab === 'feedback') navigate('/feedback');
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
            <Dashboard onUpload={onUpload} documents={documents} onDelete={onDelete} />
          } />
          <Route path="/quiz/:quizId" element={<QuizView />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [documents, setDocuments] = useState([]);

  const handleLogin = (email) => {
    setUserEmail(email);
    setIsLoggedIn(true);
    fetchDocuments();
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserEmail('');
    localStorage.removeItem('token');
  };

  const fetchDocuments = async () => {
    try {
      const { data } = await api.get('/documents');
      setDocuments(data);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    }
  };

  const handleDeleteDocument = async (docId) => {
    const isConfirmed = window.confirm("Are you sure you want to delete this file?");
    if (!isConfirmed) return;
    try {
      await api.delete(`/documents/${docId}`);
      setDocuments(documents.filter(doc => doc.id !== docId));
    } catch (error) {
      alert("Failed to delete file.");
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/upload', formData);
      alert(`File "${file.name}" uploaded successfully!`);
      fetchDocuments();
    } catch (error) {
      alert('Upload failed: ' + (error.response?.data?.detail || 'Unknown error'));
    }
    event.target.value = null;
  };

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
      />
    </BrowserRouter>
  );
}

export default App;
