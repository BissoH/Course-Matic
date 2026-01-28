import React, { useState } from 'react';
import DashboardView from './components/Dashboard.jsx';

function App() {
  const [count, setCount] = useState(0)

 const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log("File selected:", file.name);
      alert(`Selected file: ${file.name}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <main className="w-full min-h-screen bg-gray-50">
        <DashboardView onUpload={handleFileUpload} />
      </main>
    </div>
  );
}

export default App
