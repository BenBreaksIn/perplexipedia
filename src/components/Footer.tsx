import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Article } from '../types/article';
import { generateSlug } from '../utils/urlUtils';

interface FooterSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const FooterSection: React.FC<FooterSectionProps> = ({ title, isOpen, onToggle, children }) => (
  <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0 md:border-0">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-4 md:py-0 md:pointer-events-none"
    >
      <h3 className="section-title w-full text-center md:text-left">{title}</h3>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`h-5 w-5 transform transition-transform duration-200 md:hidden absolute right-6 ${isOpen ? 'rotate-180' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    <div
      className={`overflow-hidden transition-all duration-200 md:block ${
        isOpen ? 'max-h-96' : 'max-h-0 md:max-h-none'
      }`}
    >
      <div className="pb-4 md:pb-0 space-y-2">
        {children}
      </div>
    </div>
  </div>
);

export const Footer: React.FC = () => {
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState<string | null>(null);
  
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

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-perplexipedia-border mt-8">
      <div className="container !max-w-[1672px] mx-auto px-6 py-6">
        <div className="md:grid md:grid-cols-4 md:gap-8">
          <FooterSection
            title="About Perplexipedia"
            isOpen={openSection === 'about'}
            onToggle={() => toggleSection('about')}
          >
            <ul className="text-center md:text-left">
              <li><a href="#" className="nav-link block py-2">About</a></li>
              <li><a href="#" className="nav-link block py-2">Community Portal</a></li>
              <li><a href="#" className="nav-link block py-2">Statistics</a></li>
            </ul>
          </FooterSection>

          <FooterSection
            title="Contribute"
            isOpen={openSection === 'contribute'}
            onToggle={() => toggleSection('contribute')}
          >
            <ul className="text-center md:text-left">
              <li><a href="#" className="nav-link block py-2">Help</a></li>
              <li><a href="#" className="nav-link block py-2">Learn to Edit</a></li>
              <li><a href="#" className="nav-link block py-2">Community Portal</a></li>
            </ul>
          </FooterSection>

          <FooterSection
            title="Tools"
            isOpen={openSection === 'tools'}
            onToggle={() => toggleSection('tools')}
          >
            <ul className="text-center md:text-left">
              <li>
                <button
                  onClick={() => {
                    const articleId = window.location.pathname.split('/')[2];
                    if (articleId) {
                      window.location.href = `/plexi/${articleId}/info`;
                    }
                  }}
                  className="nav-link w-full text-center md:text-left block py-2"
                >
                  Page Information
                </button>
              </li>
              <li>
                <button 
                  onClick={handlePrint} 
                  className="nav-link w-full text-center md:text-left block py-2"
                >
                  Download as PDF
                </button>
              </li>
              <li>
                <button 
                  onClick={handlePrint} 
                  className="nav-link w-full text-center md:text-left block py-2"
                >
                  Printable Version
                </button>
              </li>
            </ul>
          </FooterSection>

          <FooterSection
            title="Read"
            isOpen={openSection === 'read'}
            onToggle={() => toggleSection('read')}
          >
            <ul className="text-center md:text-left">
              <li><a href="#" className="nav-link block py-2">Featured Articles</a></li>
              <li>
                <button 
                  onClick={handleRandomClick}
                  className="nav-link w-full text-center md:text-left block py-2"
                >
                  Random Article
                </button>
              </li>
              <li><a href="#" className="nav-link block py-2">Categories</a></li>
              <li><a href="#" className="nav-link block py-2">Recent Changes</a></li>
            </ul>
          </FooterSection>
        </div>

        <div className="mt-8 pt-6 border-t border-perplexipedia-border text-sm text-gray-500 dark:text-gray-400 text-center md:text-left">
          <p>Text is available under the Creative Commons Attribution-ShareAlike License; additional terms may apply.</p>
          <p className="mt-2">© 2025 Perplexipedia. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}; 