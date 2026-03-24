import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Loader2 } from 'lucide-react';
import api from '../utils/api';

const QuizView = () => {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const options = [
    { key: 'A', value: quiz.questions[0]?.option_a },
    { key: 'B', value: quiz.questions[0]?.option_b },
    { key: 'C', value: quiz.questions[0]?.option_c },
    { key: 'D', value: quiz.questions[0]?.option_d },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 pb-24">
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
            ].map(({ key, value }) => (
              <div
                key={key}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50"
              >
                <span className="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-gray-300 text-sm font-bold text-gray-600 shrink-0">
                  {key}
                </span>
                <span className="text-gray-700">{value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuizView;
