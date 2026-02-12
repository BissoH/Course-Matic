import React, { useState } from 'react';
import { Menu } from 'lucide-react'; 
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Login from './components/Login';

function App() {

  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [userEmail, setUserEmail] = useState('');

  const handleLogin = (email) => {
    setUserEmail(email);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserEmail('');
    setIsNavbarOpen(false);
  };

  const [isNavbarOpen, setIsNavbarOpen] = useState(false);
  
  
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

   
    const formData = new FormData();
    formData.append('file', file);
    formData.append('email', userEmail); 

    try {
      
      const response = await fetch('http://127.0.0.1:8000/upload', {
        method: 'POST',
        
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        alert(`File "${file.name}" uploaded successfully!`);
      } else {
        alert('Upload failed: ' + (data.detail || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Cannot connect to the server to upload the file.');
    }

    
    event.target.value = null;
  };

  const handleNavigate = (tab) => {
    setActiveTab(tab);
    setIsNavbarOpen(false); 
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      
      
      <Navbar 
        isOpen={isNavbarOpen} 
        onClose={() => setIsNavbarOpen(false)} 
        activeTab={activeTab}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />

      
      <div className="transition-all duration-300">
        
        
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
           {activeTab === 'dashboard' && <Dashboard onUpload={handleFileUpload} />}
           
           
           {activeTab === 'quiz' && (
             <div className="p-10 text-center text-gray-500">
                <h2 className="text-2xl font-bold mb-2">Quiz Section</h2>
                <p>Select a quiz</p>
             </div>
           )}
           
           {activeTab === 'feedback' && (
             <div className="p-10 text-center text-gray-500">
                <h2 className="text-2xl font-bold mb-2">Gap Analysis</h2>
                <p>Your performance stats will appear here</p>
             </div>
           )}
        </main>
      </div>
    </div>
  );
}

export default App;