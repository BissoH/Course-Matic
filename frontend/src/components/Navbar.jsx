import React from 'react';
import { X, LayoutGrid, FileText, BarChart3, LogOut, Settings } from 'lucide-react';

const Navbar = ({ isOpen, onClose, onNavigate, activeTab, onLogout }) => {
  return (
    <>
     
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity" 
          onClick={onClose}
        />
      )}


      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white shadow-2xl transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
       
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold tracking-tight">CourseMatic</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>


        <nav className="p-4 space-y-2">
          
          <button 
            onClick={() => onNavigate('dashboard')}
            className={`flex items-center w-full px-4 py-3 rounded-xl transition-all ${
              activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-5 h-5 mr-3" />
            <span className="font-medium">Dashboard</span>
          </button>

          <button 
            onClick={() => onNavigate('quiz')}
            className={`flex items-center w-full px-4 py-3 rounded-xl transition-all ${
              activeTab === 'quiz' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <FileText className="w-5 h-5 mr-3" />
            <span className="font-medium">Quizzes</span>
          </button>

          <button 
            onClick={() => onNavigate('feedback')}
            className={`flex items-center w-full px-4 py-3 rounded-xl transition-all ${
              activeTab === 'feedback' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <BarChart3 className="w-5 h-5 mr-3" />
            <span className="font-medium">Gap Analysis</span>
          </button>

        </nav>

        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <button className="flex items-center w-full px-4 py-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all">
            <Settings className="w-5 h-5 mr-3" />
            <span className="font-medium">Settings</span>
          </button>
          
          <button 
          className="flex items-center w-full px-4 py-3 text-red-400 hover:bg-red-900/20 rounded-xl transition-all mt-1"
            onClick={onLogout}>
            <LogOut className="w-5 h-5 mr-3" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>

      </div>
    </>
  );
};

export default Navbar;