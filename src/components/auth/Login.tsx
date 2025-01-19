import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const message = location.state?.message;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      if (rememberMe) {
        localStorage.setItem('rememberEmail', email);
      } else {
        localStorage.removeItem('rememberEmail');
      }
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to sign in. Please check your credentials.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load remembered email on component mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Section */}
      <div className="w-full max-w-[1672px] mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <h1 className="text-4xl font-linux-libertine text-gray-900 dark:text-white text-center">
          Welcome to Perplexipedia
        </h1>
        <p className="mt-3 text-xl text-gray-600 dark:text-gray-400 text-center max-w-2xl mx-auto">
          A free, community-driven encyclopedia powered by AI
        </p>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-[1672px] mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="grid lg:grid-cols-3 gap-16">
          {/* Left Column */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg p-8">
            <h2 className="text-2xl font-linux-libertine text-gray-900 dark:text-white mb-8">
              Write Articles Easily
            </h2>
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-perplexity-primary/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-perplexity-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white text-lg mb-2">AI Helps You Write</h3>
                  <p className="text-gray-600 dark:text-gray-400">Let AI help draft and improve your articles - no more blank page anxiety</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-perplexity-primary/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-perplexity-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white text-lg mb-2">Always Accurate</h3>
                  <p className="text-gray-600 dark:text-gray-400">AI checks facts and finds sources automatically as you write</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-perplexity-primary/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-perplexity-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white text-lg mb-2">Use Your Own Keys</h3>
                  <p className="text-gray-600 dark:text-gray-400">Connect your OpenAI or Perplexity API key for unlimited use</p>
                </div>
              </div>
            </div>
          </div>

          {/* Center Column - Login Form */}
          <div className="lg:col-span-1">
            <div className="perplexipedia-card p-8">
              <h2 className="text-2xl font-linux-libertine mb-8 section-title text-center">Log in to your account</h2>
              
              {message && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-center">
                  {message}
                </div>
              )}
              
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="search-input w-full"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="search-input w-full"
                    required
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="remember-me"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 text-perplexity-primary focus:ring-perplexity-primary border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Remember me
                    </label>
                  </div>
                  <a href="#" className="text-sm text-perplexity-primary dark:text-blue-400 hover:underline">
                    Forgot Password?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`btn-primary w-full ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div className="mt-8 text-center border-t border-gray-200 dark:border-gray-700 pt-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Don't have an account?{' '}
                  <button 
                    onClick={() => navigate('/signup')}
                    className="text-perplexity-primary dark:text-blue-400 hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg p-8">
            <h2 className="text-2xl font-linux-libertine text-gray-900 dark:text-white mb-8">
              Why Use Perplexipedia?
            </h2>
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-perplexity-primary/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-perplexity-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white text-lg mb-2">Save Time</h3>
                  <p className="text-gray-600 dark:text-gray-400">Write articles in minutes instead of hours with AI assistance</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-perplexity-primary/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-perplexity-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white text-lg mb-2">Free Forever</h3>
                  <p className="text-gray-600 dark:text-gray-400">No subscriptions or hidden fees - just write and share knowledge</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-perplexity-primary/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-perplexity-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white text-lg mb-2">Join the Community</h3>
                  <p className="text-gray-600 dark:text-gray-400">Be part of a growing community of knowledge creators</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 