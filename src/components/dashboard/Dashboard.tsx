import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DashboardProfile } from './DashboardProfile';
import { DashboardActivity } from './DashboardActivity';
import { DashboardContributions } from './DashboardContributions';
import { DashboardSaved } from './DashboardSaved';
import { DashboardSettings } from './DashboardSettings';
import { DashboardAISettings } from './DashboardAISettings';
import { ArticleManagement } from '../articles/ArticleManagement';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to profile if no specific route is selected
  React.useEffect(() => {
    if (location.pathname === '/dashboard') {
      navigate('/dashboard/profile');
    }
  }, [location, navigate]);

  const isActive = (path: string) => location.pathname === `/dashboard/${path}`;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="md:w-64 flex-shrink-0">
          <div className="wiki-card">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                {currentUser?.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt={currentUser.displayName || 'User'} 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-2xl text-gray-500 dark:text-gray-400">
                    {(currentUser?.displayName || currentUser?.email || 'U')[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-lg font-medium">{currentUser?.displayName || 'User'}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{currentUser?.email}</p>
              </div>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => navigate('/dashboard/profile')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors duration-150 ${
                  isActive('profile')
                    ? 'bg-perplexity-primary/10 text-perplexity-primary dark:bg-blue-900/30 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => navigate('/dashboard/activity')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors duration-150 ${
                  isActive('activity')
                    ? 'bg-perplexity-primary/10 text-perplexity-primary dark:bg-blue-900/30 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Recent Activity
              </button>
              <button
                onClick={() => navigate('/dashboard/contributions')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors duration-150 ${
                  isActive('contributions')
                    ? 'bg-perplexity-primary/10 text-perplexity-primary dark:bg-blue-900/30 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Contributions
              </button>
              <button
                onClick={() => navigate('/dashboard/saved')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors duration-150 ${
                  isActive('saved')
                    ? 'bg-perplexity-primary/10 text-perplexity-primary dark:bg-blue-900/30 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Saved Articles
              </button>
              <button
                onClick={() => navigate('/dashboard/settings')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors duration-150 ${
                  isActive('settings')
                    ? 'bg-perplexity-primary/10 text-perplexity-primary dark:bg-blue-900/30 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Settings
              </button>
              <button
                onClick={() => navigate('/dashboard/ai-settings')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors duration-150 ${
                  isActive('ai-settings')
                    ? 'bg-perplexity-primary/10 text-perplexity-primary dark:bg-blue-900/30 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                AI Settings
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="wiki-card">
            <Routes>
              <Route path="profile" element={<DashboardProfile />} />
              <Route path="activity" element={<DashboardActivity />} />
              <Route path="contributions" element={<DashboardContributions />} />
              <Route path="saved" element={<DashboardSaved />} />
              <Route path="settings" element={<DashboardSettings />} />
              <Route path="ai-settings" element={<DashboardAISettings />} />
              <Route path="articles/new" element={<ArticleManagement />} />
              <Route path="articles/:id/edit" element={<ArticleManagement />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}; 