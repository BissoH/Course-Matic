import React from "react";
import {Upload, AlertTriangle, CheckCircle,} from 'lucide-react';

const Dashboard = ({onUpload, documents = [] }) => 
{
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
                <span className="font-medium text-gray-800">{doc.filename}</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Ready</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>


    );
};

export default Dashboard;