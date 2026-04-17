// Settings screen displaying the signed-in user's profile details.
// The email is passed in as a prop from App.jsx rather than re-fetched so no additional API call is required to render the page.

import { User, Trash2 } from 'lucide-react';

const SettingsView = ({ email }) => {
  return (
    <div className="p-6 space-y-6 pb-24 max-w-3xl mx-auto">

      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your account preferences</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Profile</h2>
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-2xl shrink-0">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Email address</p>
            <p className="text-gray-900 font-semibold mt-0.5">{email}</p>
          </div>
        </div>
      </div>

      {/* Danger Zone is visually separated with a red border to signal that the action below is destructive. The reset button is a placeholder flagged as future work in Chapter 6. */}
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-bold text-red-600 uppercase tracking-wide">Danger Zone</h2>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-gray-900 text-sm">Reset All Data</p>
            <p className="text-gray-400 text-xs mt-1">
              Permanently delete all your uploaded documents, quizzes, and progress. This cannot be undone.
            </p>
          </div>
          <button
            onClick={() => alert('This feature is not yet available.')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

    </div>
  );
};

export default SettingsView;
