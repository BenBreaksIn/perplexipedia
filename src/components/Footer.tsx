import React from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Article } from '../types/article';
import { generateSlug } from '../utils/urlUtils';

export const Footer: React.FC = () => {
  const navigate = useNavigate();
  
  const handlePrint = () => {
    window.print();
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

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-perplexipedia-border mt-8">
      <div className="container !max-w-[1672px] mx-auto px-4 py-6">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="section-title mb-4">About Perplexipedia</h3>
            <ul className="space-y-2">
              <li><a href="#" className="nav-link">About</a></li>
              <li><a href="#" className="nav-link">Community Portal</a></li>
              <li><a href="#" className="nav-link">Statistics</a></li>
            </ul>
          </div>
          <div>
            <h3 className="section-title mb-4">Contribute</h3>
            <ul className="space-y-2">
              <li><a href="#" className="nav-link">Help</a></li>
              <li><a href="#" className="nav-link">Learn to Edit</a></li>
              <li><a href="#" className="nav-link">Community Portal</a></li>
            </ul>
          </div>
          <div>
            <h3 className="section-title mb-4">Tools</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => {
                    const articleId = window.location.pathname.split('/')[2];
                    if (articleId) {
                      window.location.href = `/plexi/${articleId}/info`;
                    }
                  }}
                  className="nav-link w-full text-left"
                >
                  Page Information
                </button>
              </li>
              <li>
                <button 
                  onClick={handlePrint} 
                  className="nav-link w-full text-left"
                >
                  Download as PDF
                </button>
              </li>
              <li>
                <button 
                  onClick={handlePrint} 
                  className="nav-link w-full text-left"
                >
                  Printable Version
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="section-title mb-4">Read</h3>
            <ul className="space-y-2">
              <li><a href="#" className="nav-link">Featured Articles</a></li>
              <li>
                <button 
                  onClick={handleRandomClick}
                  className="nav-link w-full text-left"
                >
                  Random Article
                </button>
              </li>
              <li><a href="#" className="nav-link">Categories</a></li>
              <li><a href="#" className="nav-link">Recent Changes</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-perplexipedia-border text-sm text-gray-500 dark:text-gray-400">
          <p>Text is available under the Creative Commons Attribution-ShareAlike License; additional terms may apply.</p>
          <p className="mt-2">© 2025 Perplexipedia. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}; 