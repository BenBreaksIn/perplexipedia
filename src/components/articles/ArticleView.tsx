import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Article } from '../../types/article';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Sidebar } from '../Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { getArticleIdFromSlug, generateSlug } from '../../utils/urlUtils';

const formatDate = (date: Date | Timestamp) => {
  if (date instanceof Timestamp) {
    return format(date.toDate(), 'PPP p');
  }
  return format(new Date(date), 'PPP p');
};

export const ArticleView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { currentUser } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [savingState, setSavingState] = useState<'idle' | 'saving'>('idle');

  useEffect(() => {
    const loadArticle = async () => {
      if (!slug) return;

      try {
        setLoading(true);
        const articleId = await getArticleIdFromSlug(slug);
        
        if (!articleId) {
          setError('Article not found');
          return;
        }

        const docRef = doc(db, 'articles', articleId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const articleData = docSnap.data() as Article;
          if (articleData.status !== 'published') {
            setError('This article is not available for public viewing.');
            return;
          }
          
          // If the article doesn't have a slug, add it
          if (!articleData.slug) {
            const newSlug = generateSlug(articleData.title);
            await setDoc(docRef, { ...articleData, slug: newSlug }, { merge: true });
            articleData.slug = newSlug;
          }
          
          setArticle({
            ...articleData,
            id: docSnap.id
          });

          // Check if the article is saved by the current user
          if (currentUser) {
            const savedRef = collection(db, 'saved_articles');
            const q = query(
              savedRef,
              where('userId', '==', currentUser.uid),
              where('articleId', '==', articleId)
            );
            const savedSnap = await getDocs(q);
            setIsSaved(!savedSnap.empty);
          }
        } else {
          setError('Article not found');
        }
      } catch (error) {
        console.error('Error loading article:', error);
        setError('Failed to load article');
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [slug, currentUser]);

  const handleSaveArticle = async () => {
    if (!currentUser || !article) return;

    try {
      setSavingState('saving');
      const savedArticleId = `${currentUser.uid}_${article.id}`;
      
      if (isSaved) {
        // Unsave the article
        await deleteDoc(doc(db, 'saved_articles', savedArticleId));
        setIsSaved(false);
      } else {
        // Save the article
        await setDoc(doc(db, 'saved_articles', savedArticleId), {
          id: savedArticleId,
          userId: currentUser.uid,
          articleId: article.id,
          title: article.title,
          excerpt: article.content.slice(0, 200) + '...',
          savedAt: new Date(),
          lastModified: article.updatedAt
        });
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Error saving/unsaving article:', error);
    } finally {
      setSavingState('idle');
    }
  };

  const renderInfoBox = () => {
    if (!article?.infobox) return null;
    const mainImage = article.images?.[article.infobox.image];

    return (
      <div className="float-right w-full sm:w-64 md:w-72 lg:w-80 border border-gray-300 rounded-lg p-4 sm:p-4 m-2 sm:m-4 bg-gray-50 dark:bg-gray-800">
        <h2 className="text-xl sm:text-xl lg:text-2xl font-bold mb-3">{article.infobox.title}</h2>
        {mainImage && (
          <div className="mb-4">
            <img
              src={mainImage.url}
              alt={mainImage.description}
              className="w-full rounded"
            />
            <p className="text-sm text-gray-500 mt-2">{mainImage.attribution}</p>
          </div>
        )}
        <table className="w-full">
          <tbody>
            {Object.entries(article.infobox.key_facts).map(([label, value]) => (
              <tr key={label} className="border-t border-gray-200 dark:border-gray-700">
                <th className="py-3 pr-3 text-left text-gray-600 dark:text-gray-400 align-top text-base">{label}</th>
                <td className="py-3 text-gray-900 dark:text-gray-100 text-base">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderImages = () => {
    if (!article?.images || article.images.length === 0) return null;
    
    // Skip the main image if it's used in the infobox
    const infoboxImageIndex = article.infobox?.image;
    const displayImages = article.images.filter((_, index) => index !== infoboxImageIndex);
    
    if (displayImages.length === 0) return null;

    return (
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayImages.map((image, index) => (
          <figure key={index} className="border dark:border-gray-700 rounded-lg p-3">
            <img
              src={image.url}
              alt={image.description}
              className="w-full h-48 object-cover rounded-lg"
            />
            <figcaption className="mt-3">
              <p className="text-base text-gray-900 dark:text-gray-100">{image.description}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{image.attribution}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-perplexity-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="perplexipedia-card">
          <div className="text-red-500 text-center">{error}</div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container mx-auto p-4">
        <div className="perplexipedia-card">
          <div className="text-center">Article not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container !max-w-[1672px] mx-auto px-4 py-8 flex flex-1">
      <Sidebar content={article?.content} />
      <main className="flex-1 transition-all duration-300 ease-in-out">
        <div className="perplexipedia-card">
          <article className="prose dark:prose-invert max-w-none">
            <div className="flex justify-between items-start mb-6">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-0 leading-tight">{article?.title}</h1>
              {currentUser && (
                <button
                  onClick={handleSaveArticle}
                  disabled={savingState === 'saving'}
                  className={`p-3 rounded-full transition-colors duration-200 ${
                    isSaved 
                      ? 'text-perplexity-primary hover:bg-perplexity-primary/10' 
                      : 'text-gray-400 hover:text-perplexity-primary hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title={isSaved ? 'Remove from saved articles' : 'Save article'}
                >
                  {savingState === 'saving' ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current"></div>
                  ) : (
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-6 w-6" 
                      fill={isSaved ? 'currentColor' : 'none'} 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" 
                      />
                    </svg>
                  )}
                </button>
              )}
            </div>
            <div className="flex items-center text-base text-gray-500 dark:text-gray-400 mb-8 space-x-4">
              <span>Last updated {formatDate(article.updatedAt)}</span>
              <span>·</span>
              <span>Created by {article.author || 'Anonymous'}</span>
            </div>
            {renderInfoBox()}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              className="text-base sm:text-base lg:text-lg"
              components={{
                img: ({node, ...props}) => (
                  <img {...props} className="w-full rounded-lg shadow-md" />
                ),
                a: ({node, ...props}) => (
                  <a {...props} className="text-perplexity-primary hover:text-perplexity-primary-dark" />
                ),
                h2: ({node, ...props}) => (
                  <h2 {...props} className="text-2xl sm:text-2xl lg:text-3xl font-bold mt-10 mb-6 leading-tight" />
                ),
                h3: ({node, ...props}) => (
                  <h3 {...props} className="text-xl sm:text-xl lg:text-2xl font-bold mt-8 mb-4 leading-tight" />
                ),
                p: ({node, ...props}) => (
                  <p {...props} className="text-base mb-6 leading-relaxed" />
                ),
                ul: ({node, ...props}) => (
                  <ul {...props} className="list-disc list-outside ml-5 mb-6 space-y-3 text-base" />
                ),
                ol: ({node, ...props}) => (
                  <ol {...props} className="list-decimal list-outside ml-5 mb-6 space-y-3 text-base" />
                ),
                li: ({node, ...props}) => (
                  <li {...props} className="text-base leading-relaxed pl-2" />
                ),
                blockquote: ({node, ...props}) => (
                  <blockquote {...props} className="border-l-4 border-gray-200 dark:border-gray-700 pl-6 py-2 my-6 text-base italic" />
                ),
                code: ({node, ...props}) => (
                  <code {...props} className="bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 text-base" />
                ),
                pre: ({node, ...props}) => (
                  <pre {...props} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto text-base my-6" />
                ),
              }}
            >
              {article.content}
            </ReactMarkdown>
            {renderImages()}
          </article>
        </div>
      </main>
    </div>
  );
}; 