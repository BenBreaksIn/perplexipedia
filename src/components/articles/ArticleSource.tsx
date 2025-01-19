import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Article } from '../../types/article';
import { Sidebar } from '../Sidebar';
import { getArticleIdFromSlug } from '../../utils/urlUtils';

interface ArticleVersion {
  id: string;
  articleId: string;
  version: number;
  content: string;
  title: string;
  author: string;
  authorId: string;
  timestamp: any;
  changes: string;
}

export const ArticleSource: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const version = searchParams.get('version');
  const [articleData, setArticleData] = useState<Article | ArticleVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) return;
      
      try {
        const articleId = await getArticleIdFromSlug(slug);
        
        if (!articleId) {
          setError('Article not found');
          return;
        }

        if (version) {
          // Fetch specific version
          const versionsQuery = query(
            collection(db, 'articleVersions'),
            where('articleId', '==', articleId),
            where('version', '==', parseInt(version))
          );
          
          const versionsSnapshot = await getDocs(versionsQuery);
          if (!versionsSnapshot.empty) {
            setArticleData(versionsSnapshot.docs[0].data() as ArticleVersion);
          } else {
            setError('Version not found');
          }
        } else {
          // Fetch current version
          const articleDoc = await getDoc(doc(db, 'articles', articleId));
          if (articleDoc.exists()) {
            setArticleData(articleDoc.data() as Article);
          } else {
            setError('Article not found');
          }
        }
      } catch (err) {
        setError('Failed to load article');
        console.error('Error fetching article:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [slug, version]);

  const formatSource = (data: Article | ArticleVersion) => {
    const lines = JSON.stringify(data, null, 2).split('\n');
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

  if (!articleData) {
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
            Source of: {articleData.title}
            {version && <span className="text-lg text-gray-500 ml-2">(Version {version})</span>}
          </h1>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg font-mono text-sm">
            <code className="block">
              {formatSource(articleData)}
            </code>
          </div>
        </div>
      </main>
    </div>
  );
}; 