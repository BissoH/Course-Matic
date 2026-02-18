import React, {useState} from "react";
import {Upload, AlertTriangle, CheckCircle, Eye , X} from 'lucide-react';

const Dashboard = ({onUpload, documents = [] }) => 
{
  const[selectedDoc, setSelectedDoc] = useState(null);


    return (
        <div className="p-6 space-y-6 pb-24">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Study Dashboard</h1>

        <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recommended Next Steps</h2>
        <div className="space-y-4">


        {/* Take quiz card */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-start gap-4 active:scale-95 transition-transform cursor-pointer">
            <div className="bg-blue-100 p-3 rounded-2xl">
              <CheckCircle className="text-blue-600 w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Take Quiz</h3>
              <p className="text-gray-500 text-sm mt-1">Test your knowledge on uploaded materials</p>
            </div>
          </div>

          {/* Review weak topics card */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-start gap-4 active:scale-95 transition-transform cursor-pointer">
            <div className="bg-amber-100 p-3 rounded-2xl">
              <AlertTriangle className="text-amber-600 w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Review Weak Topics</h3>
              <p className="text-gray-500 text-sm mt-1">Focus on areas that need improvement</p>
            </div>
          </div>

        </div>
      </div>

      {/* Upload course materials card */}
      
      <div className="bg-white p-8 rounded-3xl shadow-sm border-2 border-dashed border-gray-200 text-center hover:border-blue-400 transition-colors">
        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Upload className="text-gray-400 w-8 h-8" />
        </div>
        <h3 className="font-bold text-gray-900">Upload Course Materials</h3>
        <p className="text-gray-400 text-sm mt-2 mb-6">Drag and drop .PDF, .PPTX & .DOCX files here</p>
        
        <label className="block w-full cursor-pointer">
          <span className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-200">
            Upload Files
          </span>
          <input 
            type="file" 
            accept=".pdf"
            onChange={onUpload}
            className="hidden"
          />
        </label>
      </div>

      <div className="mt-8">
        <h3 className="font-bold text-gray-900 text-xl mb-4">Your Files</h3>
        
        {documents.length === 0 ? (
          <p className="text-gray-500 italic">No files uploaded yet.</p>
        ) : (
          <div className="grid gap-3">
            {documents.map((doc) => (
              <div key={doc.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                
                
                <div className="flex items-center gap-3 overflow-hidden">
                   <div className="bg-red-50 p-2 rounded-lg shrink-0">
                      <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                   </div>
                   <span className="font-medium text-gray-800 truncate">{doc.filename}</span>
                </div>

                
                <button 
                  onClick={() => setSelectedDoc(doc)}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Eye className="w-5 h-5" />
                </button>

              </div>
            ))}
          </div>
        )}
      </div>

      {selectedDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex-col shadow-2xl">

            <div className="flex items-center justify between p-4 border-b">
              <h3 className="font-bold text-gray-800">{selectedDoc.filename}</h3>
              <button onClick={() => setSelectedDoc(null)} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <iframe src={`http://127.0.0.1:8000/uploads/${selectedDoc.filename}`} className="w-full h-full bg-gray-100" title="PDF Viewer"/>

            
            </div>

            </div>

      )}

      </div>
  );
};

export default Dashboard;