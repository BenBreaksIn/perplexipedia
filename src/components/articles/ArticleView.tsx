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
      <div className="float-right w-80 border border-gray-300 rounded-lg p-4 m-4 bg-gray-50 dark:bg-gray-800">
        <h2 className="text-xl font-bold mb-2">{article.infobox.title}</h2>
        {mainImage && (
          <div className="mb-4">
            <img
              src={mainImage.url}
              alt={mainImage.description}
              className="w-full rounded"
            />
            <p className="text-xs text-gray-500 mt-1">{mainImage.attribution}</p>
          </div>
        )}
        <table className="w-full">
          <tbody>
            {Object.entries(article.infobox.key_facts).map(([label, value]) => (
              <tr key={label} className="border-t border-gray-200 dark:border-gray-700">
                <th className="py-2 pr-2 text-left text-gray-600 dark:text-gray-400">{label}</th>
                <td className="py-2 text-gray-900 dark:text-gray-100">{value}</td>
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
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayImages.map((image, index) => (
          <figure key={index} className="border dark:border-gray-700 rounded p-2">
            <img
              src={image.url}
              alt={image.description}
              className="w-full h-48 object-cover rounded"
            />
            <figcaption className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {image.description}
              <br />
              <span className="text-xs">{image.attribution}</span>
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
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-4xl font-bold mb-0">{article?.title}</h1>
              {currentUser && (
                <button
                  onClick={handleSaveArticle}
                  disabled={savingState === 'saving'}
                  className={`p-2 rounded-full transition-colors duration-200 ${
                    isSaved 
                      ? 'text-perplexity-primary hover:bg-perplexity-primary/10' 
                      : 'text-gray-400 hover:text-perplexity-primary hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title={isSaved ? 'Remove from saved articles' : 'Save article'}
                >
                  {savingState === 'saving' ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
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
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-8 space-x-4">
              <span>By {article?.author || 'Anonymous'}</span>
              <span>•</span>
              <span>Published: {formatDate(article?.createdAt)}</span>
              <span>•</span>
              <span>Last updated: {formatDate(article?.updatedAt)}</span>
            </div>
            <div className="perplexipedia-article">
              {renderInfoBox()}
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                rehypePlugins={[rehypeRaw]}
                components={{
                  h1: ({node, ...props}) => {
                    const id = props.children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    return <h1 id={id} className="text-4xl font-bold mt-8 mb-4 scroll-mt-20" {...props} />;
                  },
                  h2: ({node, ...props}) => {
                    const id = props.children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    return <h2 id={id} className="text-3xl font-bold mt-6 mb-3 scroll-mt-20" {...props} />;
                  },
                  h3: ({node, ...props}) => {
                    const id = props.children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    return <h3 id={id} className="text-2xl font-bold mt-5 mb-2 scroll-mt-20" {...props} />;
                  },
                  p: ({node, children, ...props}) => {
                    // Check if the paragraph only contains an image
                    const childrenArray = React.Children.toArray(children);
                    if (childrenArray.length === 1 && 
                        React.isValidElement(childrenArray[0]) && 
                        childrenArray[0].type === 'img') {
                      // Return the image element directly
                      return childrenArray[0];
                    }
                    return <p className="mb-4" {...props}>{children}</p>;
                  },
                  ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 ml-4" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 ml-4" {...props} />,
                  li: ({node, ...props}) => <li className="mb-1" {...props} />,
                  blockquote: ({node, ...props}) => (
                    <blockquote className="border-l-4 border-gray-300 pl-4 my-4 italic" {...props} />
                  ),
                  img: ({node, alt, src, ...props}) => (
                    <img
                      src={src}
                      alt={alt}
                      className="max-w-full h-auto rounded-lg mx-auto my-8"
                      {...props}
                    />
                  ),
                  a: ({node, href, ...props}) => (
                    <a
                      href={href}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    />
                  ),
                  table: ({node, ...props}) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" {...props} />
                    </div>
                  ),
                  th: ({node, ...props}) => (
                    <th className="px-6 py-3 bg-gray-50 dark:bg-gray-800 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" {...props} />
                  ),
                  td: ({node, ...props}) => (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100" {...props} />
                  ),
                  code: ({node, ...props}) => (
                    props.className?.includes('inline') ? (
                      <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm" {...props} />
                    ) : (
                      <code className="block bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm" {...props} />
                    )
                  )
                }}
              >
                {article?.content || ''}
              </ReactMarkdown>
              {renderImages()}
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}; 