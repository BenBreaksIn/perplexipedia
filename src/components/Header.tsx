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
  const { isMenuOpen, setIsMenuOpen } = useAppearance();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const [article, setArticle] = useState<Article | null>(null);

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

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-perplexipedia-border">
      <div className="container !max-w-[1672px] mx-auto px-4 py-2 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div 
            onClick={() => navigate('/')} 
            className="flex items-center space-x-4 cursor-pointer hover:opacity-80 transition-opacity duration-200"
          >
            <img src="/perplexipedia-logo.svg" alt="Perplexipedia" className="h-8" />
            <h1 className="text-2xl font-linux-libertine hidden md:block section-title">Perplexipedia</h1>
          </div>
        </div>
        <div className="flex-1 max-w-3xl mx-4 hidden md:block relative" ref={desktopSearchRef}>
          <input
            type="search"
            placeholder="Search Perplexipedia (Ctrl + K)"
            className="search-input w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowResults(true)}
          />
          {/* Search Results Dropdown */}
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
      <div className="md:hidden px-4 py-2 relative" ref={mobileSearchRef}>
        <input
          type="search"
          placeholder="Search Perplexipedia"
          className="search-input w-full"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
        />
        {/* Mobile Search Results Dropdown */}
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

      {/* Page Tabs with Toggle */}
      <div className="container !max-w-[1672px] mx-auto px-4 flex items-center border-b border-perplexipedia-border">
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
    </header>
  );
}; 