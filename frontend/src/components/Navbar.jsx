// Slide-in sidebar navigation. The drawer pattern was chosen over a persistent sidebar to reclaim horizontal space on narrower viewports and keep the main content centred.

import React from 'react';
import { X, LayoutGrid, FileText, BarChart3, LogOut, Settings, FolderOpen } from 'lucide-react';

const Navbar = ({ isOpen, onClose, onNavigate, activeTab, onLogout }) => {
  return (
    <>

      {/* Semi-transparent overlay dismisses the drawer when clicked, which matches the platform convention users expect from mobile menus. */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}


      {/* The drawer slides in from the left via a CSS transform, which performs better than animating width or left offset. */}
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


        {/* Primary navigation items. The activeTab prop controls the highlighted state, which is derived from the current route in App.jsx. */}
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
            onClick={() => onNavigate('files')}
            className={`flex items-center w-full px-4 py-3 rounded-xl transition-all ${
              activeTab === 'files' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <FolderOpen className="w-5 h-5 mr-3" />
            <span className="font-medium">Files</span>
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


        {/* Settings and Sign Out are pinned to the bottom of the drawer so destructive or infrequent actions are separated from the primary navigation. */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <button
            onClick={() => onNavigate('settings')}
            className={`flex items-center w-full px-4 py-3 rounded-xl transition-all ${
              activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
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
