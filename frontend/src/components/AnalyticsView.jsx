import { useState, useEffect } from 'react';
import { BarChart3, ChevronDown, ChevronUp, FileText, Sparkles, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const getColour = (percentage) => {
  if (percentage >= 80) return { bar: 'bg-green-500', badge: 'bg-green-100 text-green-700' };
  if (percentage >= 50) return { bar: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700' };
  return { bar: 'bg-red-500', badge: 'bg-red-100 text-red-600' };
};

const DocumentSection = ({ doc, navigate }) => {
  const [open, setOpen] = useState(true);
  const [generatingTopic, setGeneratingTopic] = useState(null);

  const totalCorrect = doc.topic_summary.reduce((sum, t) => sum + t.correct, 0);
  const totalQuestions = doc.topic_summary.reduce((sum, t) => sum + t.total, 0);
  const overallPct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const overallColour = getColour(overallPct);

  const handleGenerateForTopic = async (topicName) => {
    setGeneratingTopic(topicName);
    try {
      const { data } = await api.post(`/quiz/generate?doc_id=${doc.doc_id}&target_topic=${encodeURIComponent(topicName)}`);
      navigate(`/quiz/${data.quiz_id}`);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to generate quiz.');
    } finally {
      setGeneratingTopic(null);
    }
  };

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
          <span className="font-semibold text-gray-800 text-sm truncate">{doc.title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${overallColour.badge}`}>
            {overallPct}%
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-3">
          {doc.topic_summary.map((topic) => {
            const colour = getColour(topic.percentage);
            const isStrong = topic.percentage >= 80;
            const isGenerating = generatingTopic === topic.topic;
            return (
              <div key={topic.topic}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-gray-700">{topic.topic}</p>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colour.badge}`}>
                      {topic.percentage}%
                    </span>
                    <button
                      onClick={() => handleGenerateForTopic(topic.topic)}
                      disabled={!!generatingTopic}
                      className="flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-800 hover:bg-purple-50 px-2 py-0.5 rounded-lg transition-colors disabled:opacity-50"
                      title={`Generate a targeted quiz on ${topic.topic}`}
                    >
                      {isGenerating
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Sparkles className="w-3 h-3" />
                      }
                      {isGenerating ? 'Generating…' : isStrong ? 'Master this Topic' : 'Revise this Topic'}
                    </button>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${colour.bar}`}
                    style={{ width: `${topic.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{topic.correct} / {topic.total} correct</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AnalyticsView = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data } = await api.get('/analytics');
        setAnalytics(data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  return (
    <div className="p-6 space-y-6 pb-24 max-w-3xl mx-auto">

      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Gap Analysis</h1>
        <p className="text-gray-400 text-sm mt-1">Your performance broken down by document and topic</p>
      </div>

      {!loading && analytics && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Overall Score</p>
            <p className="text-2xl font-bold text-blue-600">{analytics.overall_average_percentage}%</p>
            <p className="text-xs text-gray-400">across all quizzes</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Documents</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.documents.length}</p>
            <p className="text-xs text-gray-400">with quiz data</p>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">By Document</h2>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm italic">Loading...</p>
        ) : !analytics || analytics.documents.length === 0 ? (
          <p className="text-gray-400 text-sm italic">No data yet. Complete a quiz to see your gap analysis.</p>
        ) : (
          <div className="space-y-3">
            {analytics.documents.map((doc) => (
              <DocumentSection key={doc.doc_id} doc={doc} navigate={navigate} />
            ))}
          </div>
        )}
      </div>

      {!loading && analytics && analytics.documents.length > 0 && (
        <div className="flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Strong (&ge;80%)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Developing (50–79%)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Weak (&lt;50%)</span>
        </div>
      )}

    </div>
  );
};

export default AnalyticsView;
