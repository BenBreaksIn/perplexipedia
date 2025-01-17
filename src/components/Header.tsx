import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  isMenuOpen, 
  setIsMenuOpen
}) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-wiki-border">
      <div className="container mx-auto px-4 py-2 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div 
            onClick={() => navigate('/')} 
            className="flex items-center space-x-4 cursor-pointer hover:opacity-80 transition-opacity duration-200"
          >
            <img src="/perplexipedia-logo.svg" alt="Perplexipedia" className="h-8" />
            <h1 className="text-2xl font-linux-libertine hidden md:block section-title">Perplexipedia</h1>
          </div>
        </div>
        <div className="flex-1 max-w-3xl mx-4 hidden md:block">
          <input
            type="search"
            placeholder="Search Perplexipedia (Ctrl + K)"
            className="search-input w-full"
          />
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn-secondary hidden md:block">
            Donate
          </button>
          {currentUser ? (
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => navigate('/dashboard')}
                className="btn-secondary flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="hidden md:inline">Dashboard</span>
              </button>
              <button onClick={handleLogout} className="btn-secondary">
                Log out
              </button>
            </div>
          ) : (
            <>
              <button onClick={() => navigate('/signup')} className="btn-secondary">
                Create Account
              </button>
              <button onClick={() => navigate('/login')} className="btn-primary">
                Log in
              </button>
            </>
          )}
          {/* Mobile search button */}
          <button className="btn-secondary md:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="md:hidden px-4 py-2">
        <input
          type="search"
          placeholder="Search Perplexipedia"
          className="search-input w-full"
        />
      </div>

      {/* Page Tabs with Toggle */}
      <div className="container mx-auto px-4 flex items-center border-b border-wiki-border">
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="menu-toggle md:flex hidden items-center justify-center mr-2 -mb-[2px] hover:bg-gray-100 dark:hover:bg-gray-800"
          title={isMenuOpen ? "Hide sidebar" : "Show sidebar"}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              className={`transform transition-transform duration-300 ${isMenuOpen ? 'rotate-0' : '-rotate-180'}`}
              d="M9 3.5H5C4.17157 3.5 3.5 4.17157 3.5 5V19C3.5 19.8284 4.17157 20.5 5 20.5H9M9 3.5H19C19.8284 3.5 20.5 4.17157 20.5 5V19C20.5 19.8284 19.8284 20.5 19 20.5H9M9 3.5V20.5" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round"
            />
            <path 
              className={`transform transition-all duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0'}`}
              d="M12 8.5H16M12 12H16M12 15.5H16" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round"
            />
          </svg>
        </button>
        <div className="flex flex-1">
          <a href="#" className="page-tab active">Read</a>
          <a href="#" className="page-tab">View source</a>
          <a href="#" className="page-tab">View history</a>
        </div>
      </div>
    </header>
  );
}; 