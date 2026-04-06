import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import api from '../utils/api';

const QuizReview = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAttempt = async () => {
      try {
        const { data } = await api.get(`/history/${attemptId}`);
        setAttempt(data);
      } catch (err) {
        setError('Could not load this attempt.');
      } finally {
        setLoading(false);
      }
    };
    fetchAttempt();
  }, [attemptId]);

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

      <button
        onClick={() => navigate('/history')}
        className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to History
      </button>

      {/* Score banner */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{attempt.quiz_title}</h1>
          <p className="text-gray-400 text-sm mt-1">
            Reviewed on {new Date(attempt.completed_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-blue-600">{attempt.score}/{attempt.total}</p>
          <p className="text-gray-400 text-sm">{attempt.percentage}%</p>
        </div>
      </div>

      {/* Topic breakdown */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-3">
        <h2 className="font-bold text-gray-900">Categorised by Topic</h2>
        {attempt.topic_breakdown.map((t) => {
          const isStrong = t.percentage >= 80;
          const isWeak = t.percentage < 50;
          const colours = isStrong
            ? { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-700' }
            : isWeak
            ? { bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-700',   badge: 'bg-red-100 text-red-700'   }
            : { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' };

          return (
            <div key={t.topic} className={`flex items-center justify-between p-3 rounded-xl border ${colours.bg} ${colours.border}`}>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-800 text-sm">{t.topic}</span>
                {isWeak && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                    Needs Work
                  </span>
                )}
              </div>
              <span className={`text-sm font-bold ${colours.text}`}>{t.correct}/{t.total}</span>
            </div>
          );
        })}
      </div>

      {/* Question-by-question review */}
      <h2 className="font-bold text-gray-900 text-lg">Reviewing Your Answers</h2>
      {attempt.questions_review.map((q, index) => (
        <div key={index} className={`bg-white rounded-2xl border shadow-sm p-6 space-y-4 ${q.is_correct ? 'border-green-200' : 'border-red-200'}`}>
          <div className="flex items-start gap-3">
            {q.is_correct
              ? <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              : <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            }
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{q.topic}</p>
              <p className="font-semibold text-gray-900">{index + 1}. {q.question_text}</p>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { key: 'A', value: q.option_a },
              { key: 'B', value: q.option_b },
              { key: 'C', value: q.option_c },
              { key: 'D', value: q.option_d },
            ].map(({ key, value }) => {
              const isCorrect = key === q.correct_answer;
              const isYours = key === q.your_answer;
              const isWrongPick = isYours && !isCorrect;

              const style = isCorrect
                ? 'border-green-400 bg-green-50'
                : isWrongPick
                ? 'border-red-400 bg-red-50'
                : 'border-gray-200 bg-gray-50';

              const bubbleStyle = isCorrect
                ? 'bg-green-500 border-green-500 text-white'
                : isWrongPick
                ? 'bg-red-400 border-red-400 text-white'
                : 'bg-white border-gray-300 text-gray-600';

              return (
                <div key={key} className={`flex items-center gap-3 p-3 rounded-xl border ${style}`}>
                  <span className={`w-7 h-7 flex items-center justify-center rounded-full border text-sm font-bold shrink-0 ${bubbleStyle}`}>
                    {key}
                  </span>
                  <span className="text-gray-700 text-sm">{value}</span>
                  {isCorrect && <span className="ml-auto text-xs font-bold text-green-600">Correct</span>}
                  {isWrongPick && <span className="ml-auto text-xs font-bold text-red-500">Your answer</span>}
                </div>
              );
            })}
          </div>

          {!q.is_correct && q.explanation && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-700 mb-1">Explanation</p>
              <p className="text-sm text-blue-800">{q.explanation}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default QuizReview;
