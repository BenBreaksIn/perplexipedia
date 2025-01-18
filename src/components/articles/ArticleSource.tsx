import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Article } from '../../types/article';
import { Sidebar } from '../Sidebar';

export const ArticleSource: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!id) return;
      
      try {
        const articleDoc = await getDoc(doc(db, 'articles', id));
        if (articleDoc.exists()) {
          setArticle(articleDoc.data() as Article);
        } else {
          setError('Article not found');
        }
      } catch (err) {
        setError('Failed to load article');
        console.error('Error fetching article:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id]);

  const formatSource = (article: Article) => {
    const lines = JSON.stringify(article, null, 2).split('\n');
    return lines.map((line, index) => (
      <div key={index} className="whitespace-pre-wrap break-all">
        {line}
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="container !max-w-[1672px] mx-auto px-4 py-8 flex flex-1">
        <Sidebar />
        <main className="flex-1 transition-all duration-300 ease-in-out">
          <div className="perplexipedia-card">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-perplexity-primary"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container !max-w-[1672px] mx-auto px-4 py-8 flex flex-1">
        <Sidebar />
        <main className="flex-1 transition-all duration-300 ease-in-out">
          <div className="perplexipedia-card">
            <div className="text-red-500">{error}</div>
          </div>
        </main>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container !max-w-[1672px] mx-auto px-4 py-8 flex flex-1">
        <Sidebar />
        <main className="flex-1 transition-all duration-300 ease-in-out">
          <div className="perplexipedia-card">
            <div>Article not found</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="container !max-w-[1672px] mx-auto px-4 py-8 flex flex-1">
      <Sidebar />
      <main className="flex-1 transition-all duration-300 ease-in-out">
        <div className="perplexipedia-card">
          <h1 className="text-2xl font-linux-libertine mb-4 section-title">
            Source of: {article.title}
          </h1>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg font-mono text-sm">
            <code className="block">
              {formatSource(article)}
            </code>
          </div>
        </div>
      </main>
    </div>
  );
}; 