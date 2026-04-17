// Authentication screen handling both login and registration via a shared form.
// The screen also polls the backend on mount so a clear warmup banner is shown while the Hugging Face container cold-starts.

import { useState, useEffect } from 'react';
import api from '../utils/api';
import { LogIn, User, Lock, ArrowRight, Loader2 } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // A single form is reused for both login and registration; this flag toggles labels, endpoint, and post-submit behaviour.
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [backendReady, setBackendReady] = useState(false);

  useEffect(() => {
    // The polling loop checks that the backend responds with the expected JSON body rather than just a 200 status.
    // This is necessary because Hugging Face's proxy returns a 200 "building" page during cold start, which would otherwise falsely mark the backend as ready.
    const checkBackend = async () => {
      try {
        const { data } = await api.get('/', { timeout: 10000 });
        if (data?.status === 'CourseMatic API is running') {
          setBackendReady(true);
        } else {
          setTimeout(checkBackend, 5000);
        }
      } catch {
        // A failed request triggers a retry every 5 seconds so the banner remains visible until the backend is genuinely reachable.
        setBackendReady(false);
        setTimeout(checkBackend, 5000);
      }
    };
    checkBackend();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // The endpoint is selected from the registering flag so the same submit handler serves both flows.
    const endpoint = isRegistering ? '/register' : '/login';

    try {
      const { data } = await api.post(endpoint, { email, password });

      if (isRegistering) {
        // After successful registration the user is returned to the login form rather than being auto-logged-in, making the sign-in step explicit.
        alert("Account created successfully! Please log in.");
        setIsRegistering(false);
      } else {
        // The JWT is stored in localStorage so the axios interceptor can attach it to every subsequent request.
        localStorage.setItem('token', data.access_token);
        onLogin(data.email);
      }
    } catch (err) {
      // Backend error messages are surfaced directly to the user; a generic fallback is shown when the server is unreachable.
      setError(err.response?.data?.detail || 'Cannot connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">


        {/* Banner is rendered while the backend polling has not yet confirmed readiness, managing user expectations during the cold-start delay. */}
        {!backendReady && (
          <div className="flex items-center gap-3 bg-amber-50 border-b border-amber-200 px-6 py-3">
            <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
            <p className="text-amber-700 text-sm font-medium">Backend is starting up, this may take a minute...</p>
          </div>
        )}

        <div className="px-8 pt-10 pb-6 text-center">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
            <LogIn className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {isRegistering ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-gray-500 mt-3 text-lg">
            {isRegistering ? "Join your AI study companion" : "Sign in to continue learning"}
          </p>
        </div>


        <form onSubmit={handleSubmit} className="px-8 pb-10 space-y-6">

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                required
                className="w-full pl-11 pr-4 py-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-medium"
                placeholder="student@university.ac.uk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                required
                className="w-full pl-11 pr-4 py-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-medium"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* The error message is rendered conditionally so the layout only shifts when there is an actual message to display. */}
          {error && (
            <p className="text-red-500 text-sm font-medium text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isRegistering ? "Sign Up" : "Sign In"} <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>


        <div className="bg-gray-50 px-8 py-6 text-center border-t border-gray-100">
          <p className="text-gray-600 font-medium">
            {isRegistering ? "Already have an account?" : "Don't have an account?"}
            {/* The error state is cleared when toggling modes so a stale validation message does not persist across form switches. */}
            <button
              onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
              className="text-blue-600 font-bold ml-2 hover:underline focus:outline-none"
            >
              {isRegistering ? "Log In" : "Register"}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;
