import { useState, useEffect } from 'react';
import { Upload, Eye, X, Trash2, Download, Sparkles, Loader2, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const FilesView = ({ onUpload, documents = [], onDelete }) => {
  const navigate = useNavigate();
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [generatingId, setGeneratingId] = useState(null);
  const [search, setSearch] = useState('');
  const [llamaReady, setLlamaReady] = useState(false);

  useEffect(() => {
    let active = true;
    const checkLlama = async () => {
      try {
        await api.get('/health', { timeout: 5000 });
        if (active) setLlamaReady(true);
      } catch {
        if (active) {
          setLlamaReady(false);
          setTimeout(checkLlama, 5000);
        }
      }
    };
    checkLlama();
    return () => { active = false; };
  }, []);

  const handleGenerateQuiz = async (docId) => {
    setGeneratingId(docId);
    try {
      const { data } = await api.post(`/quiz/generate?doc_id=${docId}`);
      navigate(`/quiz/${data.quiz_id}`);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to generate quiz.');
    } finally {
      setGeneratingId(null);
    }
  };

  const filtered = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 pb-24 max-w-3xl mx-auto">

      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Your Files</h1>
        <p className="text-gray-400 text-sm mt-1">Upload and manage your course materials</p>
      </div>

      {!llamaReady && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl">
          <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0 mt-0.5" />
          <p className="text-amber-700 text-sm font-medium">
            Llama 3 is warming up — on first start this takes around 80 seconds due to the cloud deployment. Quiz generation will be available once the model is loaded.
          </p>
        </div>
      )}

      {/* Upload */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border-2 border-dashed border-gray-200 text-center hover:border-blue-400 transition-colors">
        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Upload className="text-gray-400 w-8 h-8" />
        </div>
        <h3 className="font-bold text-gray-900">Upload Course Materials</h3>
        <p className="text-gray-400 text-sm mt-2 mb-6">Supports .PDF, .PPTX, .DOCX & .TXT</p>
        <label className="block w-full cursor-pointer">
          <span className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-200">
            Upload Files
          </span>
          <input
            type="file"
            accept=".pdf,.docx,.pptx,.txt"
            onChange={onUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Search */}
      {documents.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm"
          />
        </div>
      )}

      {/* File list */}
      {documents.length === 0 ? (
        <p className="text-gray-400 text-sm italic">No files uploaded yet.</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm italic">No files match your search.</p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((doc) => (
            <div key={doc.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-red-50 p-2 rounded-lg shrink-0">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="font-medium text-gray-800 truncate">{doc.filename}</span>
              </div>
              <div className="flex gap-2">
                {doc.filename.toLowerCase().endsWith('.pdf') ? (
                  <button
                    onClick={() => setSelectedDoc(doc)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View PDF"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                ) : (
                  <a
                    href={`http://127.0.0.1:8000/uploads/${doc.filename}`}
                    download
                    className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors flex"
                    title="Download File"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                )}
                <button
                  onClick={() => handleGenerateQuiz(doc.id)}
                  disabled={generatingId === doc.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-sm shadow-blue-200"
                >
                  {generatingId === doc.id
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                    : <><Sparkles className="w-3.5 h-3.5" /> Generate Quiz</>
                  }
                </button>
                <button
                  onClick={() => onDelete(doc.id)}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PDF Viewer Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-800">{selectedDoc.filename}</h3>
              <button onClick={() => setSelectedDoc(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <iframe
              src={`http://127.0.0.1:8000/uploads/${selectedDoc.filename}`}
              className="w-full h-full bg-gray-100 rounded-b-2xl"
              title="PDF Viewer"
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default FilesView;
