import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppearance } from '../../contexts/AppearanceContext';
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
  const { isMenuOpen, fontSize, setFontSize, colorMode, setColorMode } = useAppearance();
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
    <div className="container !max-w-[1672px] mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className={`${isMenuOpen ? 'md:block' : 'md:hidden'} hidden w-64 pr-8 transition-all duration-300 ease-in-out`}>
          <nav className="space-y-6">
            {/* User Profile Section */}
            <div>
              <h3 className="section-title">User Profile</h3>
              <div className="space-y-1">
                <div className="flex items-center space-x-3 mb-4 px-2">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    {currentUser?.photoURL ? (
                      <img 
                        src={currentUser.photoURL} 
                        alt={currentUser.displayName || 'User'} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xl text-gray-500 dark:text-gray-400">
                        {(currentUser?.displayName || currentUser?.email || 'U')[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{currentUser?.displayName || 'User'}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{currentUser?.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/dashboard/profile')}
                  className={`nav-link block ${isActive('profile') ? 'active' : ''}`}
                >
                  Profile
                </button>
                <button
                  onClick={() => navigate('/dashboard/activity')}
                  className={`nav-link block ${isActive('activity') ? 'active' : ''}`}
                >
                  Recent Activity
                </button>
                <button
                  onClick={() => navigate('/dashboard/contributions')}
                  className={`nav-link block ${isActive('contributions') ? 'active' : ''}`}
                >
                  Contributions
                </button>
                <button
                  onClick={() => navigate('/dashboard/saved')}
                  className={`nav-link block ${isActive('saved') ? 'active' : ''}`}
                >
                  Saved Articles
                </button>
              </div>
            </div>

            {/* Settings Section */}
            <div>
              <h3 className="section-title">Settings</h3>
              <div className="space-y-1">
                <button
                  onClick={() => navigate('/dashboard/settings')}
                  className={`nav-link block ${isActive('settings') ? 'active' : ''}`}
                >
                  Account Settings
                </button>
                <button
                  onClick={() => navigate('/dashboard/ai-settings')}
                  className={`nav-link block ${isActive('ai-settings') ? 'active' : ''}`}
                >
                  AI Settings
                </button>
              </div>
            </div>

            {/* Appearance Settings */}
            <div>
              <h3 className="section-title">Appearance</h3>
              <div className="wiki-card space-y-4">
                {/* Font Size */}
                <div className="space-y-2">
                  <h4 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Font size</h4>
                  <div className="flex w-full rounded-lg bg-gray-50 dark:bg-gray-800 p-1">
                    <button 
                      onClick={() => setFontSize('small')}
                      className={`flex-1 py-1.5 text-sm rounded-md transition-all duration-200
                        ${fontSize === 'small' 
                          ? 'bg-white dark:bg-gray-700 shadow-sm text-perplexity-primary dark:text-blue-400 font-medium' 
                          : 'text-gray-600 dark:text-gray-400 hover:text-perplexity-primary dark:hover:text-blue-400'}`}
                    >
                      Small
                    </button>
                    <button 
                      onClick={() => setFontSize('standard')}
                      className={`flex-1 py-1.5 text-sm rounded-md transition-all duration-200
                        ${fontSize === 'standard' 
                          ? 'bg-white dark:bg-gray-700 shadow-sm text-perplexity-primary dark:text-blue-400 font-medium' 
                          : 'text-gray-600 dark:text-gray-400 hover:text-perplexity-primary dark:hover:text-blue-400'}`}
                    >
                      Standard
                    </button>
                    <button 
                      onClick={() => setFontSize('large')}
                      className={`flex-1 py-1.5 text-sm rounded-md transition-all duration-200
                        ${fontSize === 'large' 
                          ? 'bg-white dark:bg-gray-700 shadow-sm text-perplexity-primary dark:text-blue-400 font-medium' 
                          : 'text-gray-600 dark:text-gray-400 hover:text-perplexity-primary dark:hover:text-blue-400'}`}
                    >
                      Large
                    </button>
                  </div>
                </div>

                {/* Color Mode */}
                <div className="space-y-2">
                  <h4 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Color mode</h4>
                  <div className="flex w-full rounded-lg bg-gray-50 dark:bg-gray-800 p-1">
                    <button 
                      onClick={() => setColorMode('light')}
                      className={`flex-1 py-1.5 text-sm rounded-md transition-all duration-200
                        ${colorMode === 'light' 
                          ? 'bg-white dark:bg-gray-700 shadow-sm text-perplexity-primary dark:text-blue-400 font-medium' 
                          : 'text-gray-600 dark:text-gray-400 hover:text-perplexity-primary dark:hover:text-blue-400'}`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                        </svg>
                        <span>Light</span>
                      </div>
                    </button>
                    <button 
                      onClick={() => setColorMode('dark')}
                      className={`flex-1 py-1.5 text-sm rounded-md transition-all duration-200
                        ${colorMode === 'dark' 
                          ? 'bg-white dark:bg-gray-700 shadow-sm text-perplexity-primary dark:text-blue-400 font-medium' 
                          : 'text-gray-600 dark:text-gray-400 hover:text-perplexity-primary dark:hover:text-blue-400'}`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                        </svg>
                        <span>Dark</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 transition-all duration-300 ease-in-out">
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