import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Loader2, CheckCircle, ChevronLeft, ChevronRight, ArrowLeft, Sparkles } from 'lucide-react';
import api from '../utils/api';

const QuizView = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [masteringTopic, setMasteringTopic] = useState(null);

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

  const handleSelect = (questionId, optionKey) => {
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
      const { data: history } = await api.get('/history');
      const attemptId = data.attempt_id ?? history[0]?.attempt_id;
      setResults({ ...data, attempt_id: attemptId });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      alert(err.response?.data?.detail || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const handleMasterTopic = async (topicName) => {
    setMasteringTopic(topicName);
    try {
      const { data } = await api.post(
        `/quiz/generate?doc_id=${quiz.doc_id}&target_topic=${encodeURIComponent(topicName)}`
      );
      navigate(`/quiz/${data.quiz_id}`);
    } catch (err) {
      alert('Could not generate targeted quiz. Please try again.');
    } finally {
      setMasteringTopic(null);
    }
  };

  if (results) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6 pb-24">

        <button
          onClick={() => navigate('/history')}
          className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Quizzes
        </button>

        <div className="flex items-center gap-4 bg-green-50 border border-green-200 rounded-2xl p-5">
          <CheckCircle className="text-green-500 w-8 h-8 shrink-0" />
          <div>
            <p className="text-green-800 font-bold text-xl">
              Score: {results.score} / {results.total}
            </p>
            <p className="text-green-600 text-sm">{results.percentage}% — Quiz complete</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-3">
          <h2 className="font-bold text-gray-900 text-lg">Knowledge Gap Summary</h2>
          {Object.entries(results.topic_breakdown).map(([topic, data]) => {
            const pct = data.total > 0 ? (data.correct / data.total) * 100 : 0;
            const isStrong = pct >= 80;
            const isWeak = pct < 50;
            const colours = isStrong
              ? { text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' }
              : isWeak
              ? { text: 'text-red-700',   bg: 'bg-red-50',   border: 'border-red-200'   }
              : { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' };
            return (
              <div key={topic} className={`flex items-center justify-between p-3 rounded-xl border ${colours.bg} ${colours.border}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-800 text-sm">{topic}</span>
                  {isWeak && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Weak Area</span>
                  )}
                  <button
                    onClick={() => handleMasterTopic(topic)}
                    disabled={!!masteringTopic}
                    className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors disabled:opacity-50"
                  >
                    {masteringTopic === topic
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Sparkles className="w-3 h-3" />
                    }
                    {masteringTopic === topic ? 'Generating…' : isStrong ? 'Master this Topic' : 'Revise this Topic'}
                  </button>
                </div>
                <span className={`text-sm font-bold shrink-0 ml-2 ${colours.text}`}>{data.correct}/{data.total}</span>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => navigate(`/review/${results.attempt_id}`)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-200"
        >
          Review Answers
        </button>
      </div>
    );
  }

  const total = quiz.questions.length;
  const q = quiz.questions[currentPage];
  const isLast = currentPage === total - 1;
  const answered = selectedAnswers[q.id];
  const progress = Math.round(((currentPage + 1) / total) * 100);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 pb-10">

      <div className="flex items-center gap-3">
        <div className="bg-blue-100 p-3 rounded-2xl">
          <FileText className="text-blue-600 w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{quiz.title}</h1>
          <p className="text-gray-500 text-sm">Question {currentPage + 1} of {total}</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 text-right">{Object.keys(selectedAnswers).length} / {total} answered</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <p className="font-semibold text-gray-900">
          <span className="text-blue-600 mr-2">{currentPage + 1}.</span>
          {q.question_text}
        </p>
        <div className="space-y-2">
          {[
            { key: 'A', value: q.option_a },
            { key: 'B', value: q.option_b },
            { key: 'C', value: q.option_c },
            { key: 'D', value: q.option_d },
          ].map(({ key, value }) => {
            const isSelected = answered === key;
            return (
              <div
                key={key}
                onClick={() => handleSelect(q.id, key)}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
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
                <span className={isSelected ? 'text-blue-700 font-medium' : 'text-gray-700'}>
                  {value}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setCurrentPage((p) => p - 1)}
          disabled={currentPage === 0}
          className="flex items-center gap-1 px-5 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || Object.keys(selectedAnswers).length !== total}
            className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> : 'Submit Quiz'}
          </button>
        ) : (
          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            className="flex-1 flex items-center justify-center gap-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 active:scale-95 transition-all"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

    </div>
  );
};

export default QuizView;
