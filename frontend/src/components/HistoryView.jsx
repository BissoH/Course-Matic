// Quiz history screen. Attempts are grouped by the source document so users tracking progress on a single file can see all attempts together.
// Grouping was introduced in Sprint 6 after feedback that a flat chronological list made it difficult to judge improvement on a specific document.

import { useState, useEffect } from 'react';
import { Loader2, ClipboardList, ChevronRight, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

// DocumentGroup is extracted as a local component so each document's collapse state can be tracked independently.
const DocumentGroup = ({ docTitle, attempts, navigate }) => {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="bg-red-50 p-2 rounded-lg shrink-0">
            <FileText className="w-4 h-4 text-red-500" />
          </div>
          <span className="font-semibold text-gray-800 text-sm truncate">{docTitle}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span className="text-xs text-gray-400">{attempts.length} attempt{attempts.length !== 1 ? 's' : ''}</span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {attempts.map((a) => {
            // Colour thresholds mirror those used across the app so the user interprets the badges consistently.
            const isStrong = a.percentage >= 80;
            const isWeak = a.percentage < 50;
            const badge = isStrong
              ? 'bg-green-100 text-green-700'
              : isWeak
              ? 'bg-red-100 text-red-700'
              : 'bg-amber-100 text-amber-700';

            return (
              <div
                key={a.attempt_id}
                onClick={() => navigate(`/review/${a.attempt_id}`)}
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 active:scale-95 transition-transform"
              >
                <div className="overflow-hidden">
                  <p className="font-medium text-gray-800 text-sm truncate">{a.quiz_title}</p>
                  <p className="text-gray-400 text-xs">
                    {new Date(a.completed_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge}`}>
                    {a.percentage}%
                  </span>
                  <span className="text-gray-400 text-xs">{a.score}/{a.total}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const HistoryView = () => {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // The /history endpoint returns attempts already sorted descending by completion time, so no client-side sort is needed before grouping.
    const fetchHistory = async () => {
      try {
        const { data } = await api.get('/history');
        setAttempts(data);
      } catch (err) {
        setError('Could not load your quiz history.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center text-red-500">
        <p className="text-lg font-semibold">{error}</p>
      </div>
    );
  }

  // Attempts are grouped into a map keyed by document title, which preserves the server-side ordering within each group.
  const grouped = attempts.reduce((acc, a) => {
    const key = a.doc_title || 'Unknown Document';
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <div className="bg-blue-100 p-3 rounded-2xl">
          <ClipboardList className="text-blue-600 w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quiz History</h1>
          <p className="text-gray-500 text-sm">Your progress over time</p>
        </div>
      </div>

      {attempts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
          <p className="font-medium">No attempts yet. Generate a quiz to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([docTitle, docAttempts]) => (
            <DocumentGroup
              key={docTitle}
              docTitle={docTitle}
              attempts={docAttempts}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryView;
