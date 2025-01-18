import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Article } from '../../types/article';
import ReactMarkdown from 'react-markdown';

export const ArticleView: React.FC = () => {
  const { id } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadArticle = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const docRef = doc(db, 'articles', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const articleData = docSnap.data() as Article;
          if (articleData.status !== 'published') {
            setError('This article is not available for public viewing.');
            return;
          }
          setArticle({
            ...articleData,
            id: docSnap.id
          });
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
  }, [id]);

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
    <div className="container mx-auto p-4">
      <div className="perplexipedia-card">
        <article className="prose dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-8 space-x-4">
            <span>By {article.author}</span>
            <span>•</span>
            <span>Last updated: {new Date(article.updatedAt).toLocaleDateString()}</span>
          </div>
          <div className="perplexipedia-article">
            {renderInfoBox()}
            <ReactMarkdown>{article.content}</ReactMarkdown>
            {renderImages()}
          </div>
        </article>
      </div>
    </div>
  );
}; 