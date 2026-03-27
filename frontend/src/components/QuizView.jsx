import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Loader2, CheckCircle } from 'lucide-react';
import api from '../utils/api';

const QuizView = () => {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelect = (questionId, optionKey) => {
    if (results) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
  };

  const handleSubmit = async () => {
    if (Object.keys(selectedAnswers).length !== quiz.questions.length) {
      alert('Please answer all questions before submitting.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { data } = await api.post(`/quiz/${quizId}/submit`, { answers: selectedAnswers });
      setResults(data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const { data } = await api.get(`/quiz/${quizId}`);
        setQuiz(data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load quiz.');
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [quizId]);

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

      {results && (
        <div className="flex items-center gap-4 bg-green-50 border border-green-200 rounded-2xl p-5">
          <CheckCircle className="text-green-500 w-8 h-8 shrink-0" />
          <div>
            <p className="text-green-800 font-bold text-xl">
              Score: {results.score} / {results.total}
            </p>
            <p className="text-green-600 text-sm">{results.percentage}% — Quiz complete</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="bg-blue-100 p-3 rounded-2xl">
          <FileText className="text-blue-600 w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
          <p className="text-gray-500 text-sm">{quiz.questions.length} questions</p>
        </div>
      </div>

      {quiz.questions.map((q, index) => (
        <div key={q.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <p className="font-semibold text-gray-900">
            <span className="text-blue-600 mr-2">{index + 1}.</span>
            {q.question_text}
          </p>
          <div className="space-y-2">
            {[
              { key: 'A', value: q.option_a },
              { key: 'B', value: q.option_b },
              { key: 'C', value: q.option_c },
              { key: 'D', value: q.option_d },
            ].map(({ key, value }) => {
              const isSelected = selectedAnswers[q.id] === key;
              return (
                <div
                  key={key}
                  onClick={() => handleSelect(q.id, key)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${results ? 'cursor-default' : 'cursor-pointer'} ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <span className={`w-7 h-7 flex items-center justify-center rounded-full border text-sm font-bold shrink-0 transition-all ${
                    isSelected
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'bg-white border-gray-300 text-gray-600'
                  }`}>
                    {key}
                  </span>
                  <span className={`${isSelected ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                    {value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {!results && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
                : <>Submit Quiz — {Object.keys(selectedAnswers).length}/{quiz.questions.length} answered</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizView;
