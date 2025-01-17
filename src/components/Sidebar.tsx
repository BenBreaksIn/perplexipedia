import React, { useState } from 'react';

interface SidebarProps {
  isMenuOpen: boolean;
  fontSize: string;
  setFontSize: (size: string) => void;
  colorMode: string;
  setColorMode: (mode: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMenuOpen,
  fontSize,
  setFontSize,
  colorMode,
  setColorMode
}) => {
  const [showAppearance, setShowAppearance] = useState(true);

  return (
    <aside className={`${isMenuOpen ? 'md:block' : 'md:hidden'} hidden w-64 pr-8 transition-all duration-300 ease-in-out`}>
      <nav className="space-y-6">
        <div>
          <h3 className="section-title">Navigation</h3>
          <div className="space-y-1">
            <a href="#" className="nav-link block">Main Page</a>
            <a href="#" className="nav-link block">Contents</a>
            <a href="#" className="nav-link block">Featured Content</a>
            <a href="#" className="nav-link block">Random Article</a>
          </div>
        </div>

        {/* Tools Section */}
        <div>
          <h3 className="section-title">Tools</h3>
          <div className="space-y-1">
            <a href="#" className="nav-link block">What links here</a>
            <a href="#" className="nav-link block">Related changes</a>
            <a href="#" className="nav-link block">Special pages</a>
            <a href="#" className="nav-link block">Permanent link</a>
            <a href="#" className="nav-link block">Page information</a>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="relative">
          {!showAppearance && (
            <button
              onClick={() => setShowAppearance(true)}
              className="w-full text-left nav-link flex items-center space-x-2 py-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <span>Show appearance settings</span>
            </button>
          )}
          
          {showAppearance && (
            <div className="wiki-card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="section-title mb-0">Appearance</h3>
                <button
                  onClick={() => setShowAppearance(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200"
                  title="Hide appearance settings"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
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

              {/* Width Setting */}
              <div className="space-y-2">
                <h4 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Width</h4>
                <div className="flex w-full rounded-lg bg-gray-50 dark:bg-gray-800 p-1">
                  <button className="flex-1 py-1.5 text-sm rounded-md text-gray-600 dark:text-gray-400 hover:text-perplexity-primary dark:hover:text-blue-400">
                    Default
                  </button>
                  <button className="flex-1 py-1.5 text-sm rounded-md text-gray-600 dark:text-gray-400 hover:text-perplexity-primary dark:hover:text-blue-400">
                    Wide
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}; 