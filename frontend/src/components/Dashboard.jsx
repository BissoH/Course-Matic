// Main landing screen after login. Provides a high-level performance overview and directs new users towards the upload flow.
// The Dashboard was separated from file management in Sprint 6 so it can act purely as an analytical view rather than a cluttered control panel.

import React, { useState, useEffect } from "react";
import { AlertTriangle, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const Dashboard = ({ documents = [], documentsLoaded = false }) => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    // Analytics and history are fetched in parallel with Promise.all so the page renders in a single render pass rather than progressively.
    const fetchDashboardData = async () => {
      try {
        const [analyticsRes, historyRes] = await Promise.all([
          api.get('/analytics'),
          api.get('/history'),
        ]);
        setAnalytics(analyticsRes.data);
        // Only the three most recent attempts are displayed here to keep the dashboard focused; the full history lives on its own page.
        setRecentActivity(historyRes.data.slice(0, 3));
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    };
    fetchDashboardData();
  }, []);

  // The single weakest topic drives the recommended action banner below, making the next study step explicit rather than implicit.
  const weakestTopic = analytics?.weakest_topics?.[0];

  return (
    <div className="p-6 space-y-6 pb-24 max-w-3xl mx-auto">

      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Your personalised learning overview</p>
      </div>

      {/* Three top-line metric tiles: overall score, quiz count, and the primary gap topic. Dashes render while analytics are loading to avoid layout shift. */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Overall Score</p>
          <p className="text-2xl font-bold text-blue-600">
            {analytics ? `${analytics.overall_average_percentage}%` : '—'}
          </p>
          <p className="text-xs text-gray-400">across all quizzes</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Quizzes Completed</p>
          <p className="text-2xl font-bold text-gray-900">
            {analytics ? analytics.total_quizzes_taken : '—'}
          </p>
          <p className="text-xs text-gray-400">total attempts</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Primary Gap</p>
          <p className="text-sm font-bold text-red-500 leading-tight mt-1">
            {weakestTopic ? weakestTopic.topic : '—'}
          </p>
          <p className="text-xs text-gray-400">
            {weakestTopic ? `${weakestTopic.percentage}% correct` : 'no data yet'}
          </p>
        </div>
      </div>

      {/* The recommended action banner is only rendered when analytics actually identify a weak topic, which avoids patronising prompts on a fresh account. */}
      {weakestTopic && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="bg-amber-100 p-2 rounded-xl shrink-0">
            <AlertTriangle className="text-amber-600 w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Recommended Action</h3>
            <p className="text-gray-600 text-sm mt-1">
              Your weakest area is <span className="font-semibold text-amber-700">{weakestTopic.topic}</span>.
              We recommend a Targeted Remediation session to improve your understanding.
            </p>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Recent Activity</h2>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-gray-400 text-sm italic">No quizzes taken yet.</p>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((a) => {
              const isStrong = a.percentage >= 80;
              const isWeak = a.percentage < 50;
              const badgeColour = isStrong ? 'bg-green-100 text-green-700' : isWeak ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700';
              return (
                <div
                  key={a.attempt_id}
                  onClick={() => navigate(`/review/${a.attempt_id}`)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center justify-between cursor-pointer active:scale-95 transition-transform"
                >
                  <div className="overflow-hidden">
                    <p className="font-medium text-gray-800 text-sm truncate">{a.quiz_title}</p>
                    <p className="text-gray-400 text-xs">
                      {new Date(a.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ml-3 ${badgeColour}`}>
                    {a.percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* Empty-state call-to-action added in Sprint 6 after usability testing showed new users were unsure where to begin. */}
      {/* Rendered only once documents have finished loading so the CTA does not flash briefly before the document list arrives. */}
      {documentsLoaded && documents.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center space-y-3">
          <p className="text-gray-700 font-medium">You haven't uploaded any course materials yet.</p>
          <p className="text-gray-500 text-sm">Upload a file to generate your first quiz and start tracking your progress.</p>
          <button
            onClick={() => navigate('/files')}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-200"
          >
            Upload your first file to get started →
          </button>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
