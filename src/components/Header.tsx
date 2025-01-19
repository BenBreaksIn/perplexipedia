import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppearance } from '../contexts/AppearanceContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Article } from '../types/article';
import { generateSlug, getArticleIdFromSlug } from '../utils/urlUtils';

interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
}

export const Header: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { isMenuOpen, setIsMenuOpen, fontSize, setFontSize, colorMode, setColorMode } = useAppearance();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const [article, setArticle] = useState<Article | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [showAppearanceSettings, setShowAppearanceSettings] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        (desktopSearchRef.current && !desktopSearchRef.current.contains(event.target as Node)) &&
        (mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node))
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search articles when query changes
  useEffect(() => {
    const searchArticles = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        const articlesRef = collection(db, 'articles');
        const searchLower = searchQuery.toLowerCase();
        
        // First, get all published articles
        const q = query(
          articlesRef,
          where('status', '==', 'published'),
          orderBy('title'),
          limit(50) // Get more articles to filter through
        );

        const querySnapshot = await getDocs(q);
        const results: SearchResult[] = [];

        // Filter articles client-side for partial matches
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.title.toLowerCase().includes(searchLower)) {
            results.push({
              id: doc.id,
              title: data.title,
              excerpt: data.content?.slice(0, 150) + '...' || 'No content available'
            });
          }
        });

        // Sort by relevance (exact matches first, then partial matches)
        results.sort((a, b) => {
          const aTitle = a.title.toLowerCase();
          const bTitle = b.title.toLowerCase();
          const aStartsWith = aTitle.startsWith(searchLower);
          const bStartsWith = bTitle.startsWith(searchLower);
          
          if (aStartsWith && !bStartsWith) return -1;
          if (!aStartsWith && bStartsWith) return 1;
          return aTitle.localeCompare(bTitle);
        });

        // Limit to top 5 results after filtering and sorting
        setSearchResults(results.slice(0, 5));
        setShowResults(true);
      } catch (error) {
        console.error('Error searching articles:', error);
      }
    };

    const debounceTimeout = setTimeout(searchArticles, 300);
    return () => clearTimeout(debounceTimeout);
  }, [searchQuery]);

  const handleSearchSelect = async (articleId: string) => {
    try {
      const docRef = doc(db, 'articles', articleId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const article = docSnap.data() as Article;
        setShowResults(false);
        setSearchQuery('');
        navigate(`/plexi/${article.slug || generateSlug(article.title)}`, { replace: true });
      }
    } catch (error) {
      console.error('Error loading article:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const getRandomArticle = async () => {
    try {
      // Query all published articles
      const articlesRef = collection(db, 'articles');
      const q = query(articlesRef, where('status', '==', 'published'));
      const querySnapshot = await getDocs(q);
      
      // Convert to array and get random article
      const articles = querySnapshot.docs.map(doc => ({ id: doc.id }));
      if (articles.length === 0) return null;
      
      const randomIndex = Math.floor(Math.random() * articles.length);
      return articles[randomIndex].id;
    } catch (error) {
      console.error('Error getting random article:', error);
      return null;
    }
  };

  const handleRandomClick = async () => {
    const randomId = await getRandomArticle();
    if (randomId) {
      try {
        const docRef = doc(db, 'articles', randomId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const article = docSnap.data() as Article;
          navigate(`/plexi/${article.slug || generateSlug(article.title)}`);
        }
      } catch (error) {
        console.error('Error loading random article:', error);
      }
    }
  };

  const getTabPath = () => {
    const path = location.pathname;
    if (path.includes('/source')) return 'source';
    if (path.includes('/history')) return 'history';
    if (path.includes('/info')) return 'info';
    return 'read';
  };

  const currentTab = getTabPath();
  const slug = location.pathname.split('/')[2]; // Get slug from URL

  useEffect(() => {
    const loadArticle = async () => {
      if (!slug) return;

      try {
        const articleId = await getArticleIdFromSlug(slug);
        if (!articleId) return;

        const docRef = doc(db, 'articles', articleId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setArticle({
            ...docSnap.data() as Article,
            id: docSnap.id
          });
        }
      } catch (error) {
        console.error('Error loading article:', error);
      }
    };

    loadArticle();
  }, [slug]);

  const handleTabClick = (tab: string) => {
    if (!article) return;
    
    switch (tab) {
      case 'read':
        navigate(`/plexi/${article.slug || generateSlug(article.title)}`);
        break;
      case 'source':
        navigate(`/plexi/${article.slug || generateSlug(article.title)}/source`);
        break;
      case 'history':
        navigate(`/plexi/${article.slug || generateSlug(article.title)}/history`);
        break;
      case 'info':
        navigate(`/plexi/${article.slug || generateSlug(article.title)}/info`);
        break;
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = window.location.origin + location.pathname;
      await navigator.clipboard.writeText(url);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const isArticlePage = location.pathname.startsWith('/plexi/') && !location.pathname.includes('/edit');

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-perplexipedia-border">
      <div className="container !max-w-[1672px] mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <div 
            onClick={() => navigate('/')} 
            className="flex items-center space-x-5 cursor-pointer hover:opacity-80 transition-opacity duration-200"
          >
            <img src="/perplexipedia-logo.svg" alt="Perplexipedia" className="h-8" />
            <h1 className="text-2xl font-linux-libertine section-title">Perplexipedia</h1>
          </div>
        </div>

        {/* Desktop Search and Navigation */}
        <div className="hidden md:flex flex-1 items-center justify-end space-x-4">
          <div className="flex-1 max-w-3xl mx-4 relative" ref={desktopSearchRef}>
            <input
              type="search"
              placeholder="Search Perplexipedia (Ctrl + K)"
              className="search-input w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowResults(true)}
            />
            {showResults && searchResults.length > 0 && (
              <div className="absolute w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSearchSelect(result.id);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-b last:border-b-0 border-gray-200 dark:border-gray-700"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{result.title}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{result.excerpt}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn-secondary">
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
                <span>Dashboard</span>
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
        </div>

        {/* Mobile Header Controls */}
        <div className="flex md:hidden items-center space-x-4">
          <button 
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
            aria-label="Toggle search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
            aria-label="Toggle menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div 
        className={`md:hidden transition-all duration-300 overflow-hidden ${
          isMobileSearchOpen ? 'max-h-16 py-3' : 'max-h-0'
        }`}
        ref={mobileSearchRef}
      >
        <div className="container mx-auto px-6">
          <input
            type="search"
            placeholder="Search Perplexipedia"
            className="search-input w-full py-2.5"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowResults(true)}
          />
          {showResults && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 mx-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => {
                    handleSearchSelect(result.id);
                    setIsMobileSearchOpen(false);
                  }}
                  className="w-full px-5 py-4 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-b last:border-b-0 border-gray-200 dark:border-gray-700"
                >
                  <div className="font-medium text-gray-900 dark:text-white">{result.title}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">{result.excerpt}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden transition-opacity duration-300 ${
          isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <div
          className={`fixed inset-y-0 right-0 w-80 bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 overflow-y-auto ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 space-y-6">
            <div className="flex justify-end">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Navigation Section */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Navigation</div>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      handleRandomClick();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    Random
                  </button>
                  <button
                    onClick={() => {
                      navigate('/featured');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    Featured
                  </button>
                  <button
                    onClick={() => {
                      if (!currentUser) {
                        navigate('/login', { state: { message: 'Please log in or sign up to start contributing.' } });
                      } else {
                        navigate('/dashboard/contributions');
                      }
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    Contribute
                  </button>
                </div>
              </div>

              {/* Tools Section */}
              {isArticlePage && (
                <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Tools</div>
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        window.print();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    >
                      Print/Download PDF
                    </button>
                    <button
                      onClick={() => {
                        handleCopyLink();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    >
                      {showCopySuccess ? 'Copied!' : 'Copy link'}
                    </button>
                    <button
                      onClick={() => {
                        const articleId = location.pathname.split('/')[2];
                        if (articleId) {
                          window.location.href = `/plexi/${articleId}/info`;
                        }
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    >
                      Page information
                    </button>
                    <button
                      onClick={() => {
                        setShowAppearanceSettings(!showAppearanceSettings);
                      }}
                      className="w-full text-left py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    >
                      Appearance settings
                    </button>
                  </div>

                  {/* Appearance Settings Panel */}
                  {showAppearanceSettings && (
                    <div className="mt-4 space-y-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      {/* Font Size */}
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Font size</div>
                        <div className="flex w-full rounded-lg bg-white dark:bg-gray-900 p-1">
                          <button 
                            onClick={() => setFontSize('small')}
                            className={`flex-1 py-2 text-sm rounded-md transition-all duration-200
                              ${fontSize === 'small' 
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium' 
                                : 'text-gray-600 dark:text-gray-300'}`}
                          >
                            Small
                          </button>
                          <button 
                            onClick={() => setFontSize('standard')}
                            className={`flex-1 py-2 text-sm rounded-md transition-all duration-200
                              ${fontSize === 'standard' 
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium' 
                                : 'text-gray-600 dark:text-gray-300'}`}
                          >
                            Standard
                          </button>
                          <button 
                            onClick={() => setFontSize('large')}
                            className={`flex-1 py-2 text-sm rounded-md transition-all duration-200
                              ${fontSize === 'large' 
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium' 
                                : 'text-gray-600 dark:text-gray-300'}`}
                          >
                            Large
                          </button>
                        </div>
                      </div>

                      {/* Color Mode */}
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Color mode</div>
                        <div className="flex w-full rounded-lg bg-white dark:bg-gray-900 p-1">
                          <button 
                            onClick={() => setColorMode('light')}
                            className={`flex-1 py-2 text-sm rounded-md transition-all duration-200
                              ${colorMode === 'light' 
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium' 
                                : 'text-gray-600 dark:text-gray-300'}`}
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
                            className={`flex-1 py-2 text-sm rounded-md transition-all duration-200
                              ${colorMode === 'dark' 
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium' 
                                : 'text-gray-600 dark:text-gray-300'}`}
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
                  )}
                </div>
              )}

              {/* Account Section */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Account</div>
                <div className="space-y-3">
                  {!currentUser ? (
                    <>
                      <button
                        onClick={() => {
                          navigate('/login');
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full text-left py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      >
                        Log in
                      </button>
                      <button
                        onClick={() => {
                          navigate('/signup');
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full text-left py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      >
                        Create Account
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          navigate('/dashboard');
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full text-left py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      >
                        Dashboard
                      </button>
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full text-left py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      >
                        Log out
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Support Section */}
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Support</div>
                <button
                  onClick={() => {
                    window.location.href = 'https://donate.perplexipedia.org';
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Donate
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page Tabs with Toggle - Desktop Only */}
      <div className="hidden md:block">
        <div className="container !max-w-[1672px] mx-auto px-4 flex items-center border-b border-perplexipedia-border">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="menu-toggle flex items-center justify-center mr-2 -mb-[2px] hover:bg-gray-100 dark:hover:bg-gray-800"
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
            </svg>
          </button>
          <div className="flex flex-1">
            <button 
              onClick={() => handleTabClick('read')}
              className={`page-tab ${currentTab === 'read' ? 'active' : ''}`}
            >
              Read
            </button>
            <button 
              onClick={() => handleTabClick('source')}
              className={`page-tab ${currentTab === 'source' ? 'active' : ''}`}
            >
              View source
            </button>
            <button 
              onClick={() => handleTabClick('history')}
              className={`page-tab ${currentTab === 'history' ? 'active' : ''}`}
            >
              View history
            </button>
            <div className="ml-auto flex">
              <button 
                onClick={handleRandomClick}
                className="page-tab"
              >
                Featured
              </button>
              <button 
                onClick={handleRandomClick}
                className="page-tab"
              >
                Random
              </button>
              <button 
                onClick={() => {
                  if (!currentUser) {
                    navigate('/login', { state: { message: 'Please log in or sign up to start contributing.' } });
                    return;
                  }
                  navigate('/dashboard/contributions');
                }}
                className="page-tab"
              >
                Contribute
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}; 