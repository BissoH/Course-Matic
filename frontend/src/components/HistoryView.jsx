import React, { useState, useEffect } from 'react';
import { Loader2, ClipboardList, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const HistoryView = () => {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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
          {attempts.map((a) => {
            const isStrong = a.percentage >= 80;
            const isWeak = a.percentage < 50;
            const colours = isStrong
              ? { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-700' }
              : isWeak
              ? { bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-700',   badge: 'bg-red-100 text-red-700'   }
              : { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' };

            return (
              <div key={a.attempt_id} onClick={() => navigate(`/review/${a.attempt_id}`)} className={`bg-white rounded-2xl border ${colours.border} shadow-sm p-5 flex items-center justify-between cursor-pointer active:scale-95 transition-transform`}>
                <div className="space-y-1 overflow-hidden">
                  <p className="font-semibold text-gray-900 truncate">{a.quiz_title}</p>
                  <p className="text-gray-400 text-xs">
                    {new Date(a.completed_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${colours.badge}`}>
                    {a.percentage}%
                  </span>
                  <span className="text-gray-500 text-sm font-medium">{a.score}/{a.total}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HistoryView;
