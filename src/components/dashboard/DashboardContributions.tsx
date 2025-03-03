import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAI } from '../../hooks/useAI';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Article, ArticleStatus } from '../../types/article';
import { generateSlug } from '../../utils/urlUtils';
import { PreviewModal } from '../articles/PreviewModal';

interface AutoPilotConfig {
  numberOfArticles: number;
  minWordCount: number;
  maxWordCount: number;
  selectedTopics: string[];
}

type FilterStatus = ArticleStatus | 'all';
type SortOption = 'newest' | 'oldest' | 'a-z' | 'z-a';

// Add type for Firestore Timestamp
interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

export const DashboardContributions = () => {
  const navigate = useNavigate();
  const { generateArticles } = useAI();
  const { currentUser } = useAuth();
  const [showAutoPilot, setShowAutoPilot] = useState(false);
  const [step, setStep] = useState(1);
  const [inputValue, setInputValue] = useState('');
  const [config, setConfig] = useState<AutoPilotConfig>({
    numberOfArticles: 1,
    minWordCount: 500,
    maxWordCount: 2000,
    selectedTopics: []
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [articles, setArticles] = useState<Article[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const [previewArticle, setPreviewArticle] = useState<Article | null>(null);

  const addTopic = (topic: string) => {
    const trimmedTopic = topic.trim();
    if (trimmedTopic && !config.selectedTopics.includes(trimmedTopic)) {
      if (config.selectedTopics.length >= 10) {
        setError('Maximum 10 topics allowed');
        return;
      }
      setConfig(prev => ({
        ...prev,
        selectedTopics: [...prev.selectedTopics, trimmedTopic]
      }));
      setError(null);
    }
    setInputValue('');
  };

  const removeTopic = (topicToRemove: string) => {
    setConfig(prev => ({
      ...prev,
      selectedTopics: prev.selectedTopics.filter(topic => topic !== topicToRemove)
    }));
  };

  useEffect(() => {
    loadArticles();
  }, [currentUser]);

  const loadArticles = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      // Load articles where user is the author
      const articlesRef = collection(db, 'articles');
      const q = query(articlesRef, where('authorId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      const loadedArticles = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Article[];

      // Load article versions where user is the contributor
      const versionsRef = collection(db, 'articleVersions');
      const versionsQuery = query(
        versionsRef,
        where('authorId', '==', currentUser.uid),
        where('status', '==', 'pending')
      );
      const versionsSnapshot = await getDocs(versionsQuery);
      
      // Get the articles for these versions
      const articleIds = new Set(versionsSnapshot.docs.map(doc => doc.data().articleId));
      const contributedArticlesPromises = Array.from(articleIds).map(async (articleId) => {
        const articleDoc = await getDoc(doc(db, 'articles', articleId));
        if (articleDoc.exists() && articleDoc.data().authorId !== currentUser.uid) {
          return {
            id: articleDoc.id,
            ...articleDoc.data(),
            isContribution: true
          } as Article;
        }
        return null;
      });
      
      const contributedArticles = (await Promise.all(contributedArticlesPromises))
        .filter((article): article is Article => article !== null);

      // Combine both arrays, removing duplicates
      const allArticles = [...loadedArticles, ...contributedArticles];
      const uniqueArticles = Array.from(new Map(allArticles.map(article => [article.id, article])).values());
      
      setArticles(uniqueArticles);
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateArticles = async () => {
    if (!currentUser) return;

    try {
      setIsGenerating(true);
      setProgress(0);

      const prompt = `Generate ${config.numberOfArticles} articles about ${config.selectedTopics.join(', ')} with length between ${config.minWordCount} and ${config.maxWordCount} words each`;
      const articles = await generateArticles(
        prompt, 
        config.numberOfArticles, 
        [], // existing articles
        config.minWordCount,
        config.maxWordCount
      );
      const total = articles.length;
      
      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        if (article) {
          const articleId = crypto.randomUUID();
          const articleWithAuthor = {
            ...article,
            author: currentUser.displayName || currentUser.email || 'unknown',
            authorId: currentUser.uid,
            id: articleId,
            createdAt: new Date(),
            updatedAt: new Date(),
            slug: generateSlug(article.title || 'untitled')
          };

          // Save the article
          await setDoc(doc(db, 'articles', articleId), articleWithAuthor);

          // Save the initial version to articleVersions collection
          const versionId = crypto.randomUUID();
          const timestamp = new Date();
          await setDoc(doc(db, 'articleVersions', versionId), {
            id: versionId,
            articleId: articleId,
            version: 1,
            content: article.content,
            title: article.title,
            author: currentUser.displayName || currentUser.email || 'unknown',
            authorId: currentUser.uid,
            timestamp: timestamp,
            changes: 'Initial version generated by AI',
            status: 'pending',
            isAIGenerated: true
          });
        }
        setProgress(((i + 1) / total) * 100);
      }

      setShowAutoPilot(false);
      setStep(1);
      setConfig({
        numberOfArticles: 1,
        minWordCount: 500,
        maxWordCount: 2000,
        selectedTopics: []
      });
      await loadArticles();
    } catch (error) {
      console.error('Error generating articles:', error);
      setError('Failed to generate articles. Please try again.');
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const getSortedArticles = (articles: Article[]) => {
    const sorted = [...articles];
    
    const getTimestamp = (date: string | Date | FirestoreTimestamp): number => {
      if (typeof date === 'object' && 'seconds' in date) {
        return date.seconds;
      }
      return new Date(date).getTime() / 1000;
    };

    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => {
          const dateA = getTimestamp(a.createdAt);
          const dateB = getTimestamp(b.createdAt);
          return dateB - dateA;
        });
      case 'oldest':
        return sorted.sort((a, b) => {
          const dateA = getTimestamp(a.createdAt);
          const dateB = getTimestamp(b.createdAt);
          return dateA - dateB;
        });
      case 'a-z':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'z-a':
        return sorted.sort((a, b) => b.title.localeCompare(a.title));
      default:
        return sorted;
    }
  };

  const filteredArticles = getSortedArticles(
    articles.filter(article => filterStatus === 'all' ? true : article.status === filterStatus)
  );

  const renderStep1 = () => (
    <div className="h-full flex flex-col justify-center items-center">
      <div className="text-center w-full max-w-lg px-12">
        <h4 className="text-4xl font-medium mb-16">How many articles?</h4>
        <div className="flex justify-center mb-12">
          <input
            type="number"
            min="1"
            max="10"
            value={config.numberOfArticles}
            onChange={(e) => setConfig(prev => ({ ...prev, numberOfArticles: parseInt(e.target.value) || 1 }))}
            className="text-7xl w-32 text-center bg-transparent border-b-2 border-perplexity-primary/20 focus:border-perplexity-primary focus:outline-none"
          />
        </div>
        <p className="text-lg text-gray-500">You can generate up to 10 articles at once</p>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="h-full flex flex-col justify-center items-center">
      <div className="text-center w-full max-w-lg px-12">
        <h4 className="text-4xl font-medium mb-16">Article length</h4>
        <div className="grid grid-cols-2 gap-24 mb-12">
          <div>
            <p className="mb-6 text-lg text-gray-500">Minimum words</p>
            <input
              type="number"
              min="100"
              max="5000"
              step="100"
              value={config.minWordCount}
              onChange={(e) => setConfig(prev => ({ ...prev, minWordCount: parseInt(e.target.value) || 500 }))}
              className="text-5xl w-full text-center bg-transparent border-b-2 border-perplexity-primary/20 focus:border-perplexity-primary focus:outline-none"
            />
          </div>
          <div>
            <p className="mb-6 text-lg text-gray-500">Maximum words</p>
            <input
              type="number"
              min="100"
              max="5000"
              step="100"
              value={config.maxWordCount}
              onChange={(e) => setConfig(prev => ({ ...prev, maxWordCount: parseInt(e.target.value) || 2000 }))}
              className="text-5xl w-full text-center bg-transparent border-b-2 border-perplexity-primary/20 focus:border-perplexity-primary focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="h-full flex flex-col justify-center items-center" style={{ marginTop: '80px' }}>
      <div className="text-center w-full max-w-xl px-6">
        <h4 className="text-4xl font-medium mb-16">What topics interest you?</h4>
        <div className="flex flex-col mb-12">
          <input
            type="text"
            placeholder={config.selectedTopics.length >= 10 ? "Maximum topics reached" : "Type a topic and press Enter"}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputValue) {
                e.preventDefault();
                addTopic(inputValue);
              }
            }}
            disabled={config.selectedTopics.length >= 10}
            className="w-full p-6 text-2xl bg-transparent border-b-2 border-perplexity-primary/20 focus:border-perplexity-primary focus:outline-none text-center placeholder:text-gray-400 disabled:opacity-50"
          />
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <div className="mt-4 h-[140px] overflow-y-auto px-1">
            <div className="flex flex-wrap gap-1 justify-center">
              {config.selectedTopics.map(topic => (
                <span
                  key={topic}
                  className="inline-flex items-center px-2.5 py-1 rounded-full bg-perplexity-primary/10 text-perplexity-primary text-base"
                >
                  {topic}
                  <button
                    onClick={() => removeTopic(topic)}
                    className="ml-1 opacity-60 hover:opacity-100"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isGenerating && progress === 0) {
      // Start with quick progress to 15%
      setSimulatedProgress(15);
      
      // Then slowly progress to 85% while waiting
      interval = setInterval(() => {
        setSimulatedProgress(prev => {
          if (prev < 85) {
            return prev + (Math.random() * 0.5);
          }
          return prev;
        });
      }, 150);
    } else if (progress > 0) {
      // Once real progress starts, jump to that value
      setSimulatedProgress(progress);
    } else {
      setSimulatedProgress(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGenerating, progress]);

  const renderProgress = () => {
    const displayProgress = simulatedProgress;
    
    return (
      <div className="h-full flex flex-col justify-center items-center">
        <div className="w-full max-w-lg space-y-12 px-12">
          <div className="text-center">
            <h4 className="text-4xl font-medium mb-4">Generating your articles</h4>
            <p className="text-xl text-gray-500">This might take a minute...</p>
          </div>

          <div className="space-y-8">
            <div className="relative">
              <div className="h-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  style={{ 
                    width: `${displayProgress}%`,
                    transition: 'width 0.3s ease-out'
                  }}
                  className="h-full bg-perplexity-primary relative"
                >
                  <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                </div>
              </div>
              <div className="mt-4 flex justify-between items-center">
                <div className="space-y-1">
                  <div className="text-2xl font-medium">{Math.round(displayProgress)}%</div>
                  <div className="text-sm text-gray-500">Overall Progress</div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-2xl font-medium">
                    {progress === 0 ? '0' : Math.round(displayProgress/100 * config.numberOfArticles)}/{config.numberOfArticles}
                  </div>
                  <div className="text-sm text-gray-500">Articles Generated</div>
                </div>
              </div>
            </div>

            {error ? (
              <div className="text-center space-y-4">
                <p className="text-red-500 text-lg">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    setIsGenerating(false);
                  }}
                  className="px-6 py-3 text-base bg-perplexity-primary text-white rounded-lg hover:bg-perplexity-primary/90"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-4">
                <div className="w-2 h-2 rounded-full bg-perplexity-primary animate-[bounce_1s_infinite]" style={{ animationDelay: '0s' }} />
                <div className="w-2 h-2 rounded-full bg-perplexity-primary animate-[bounce_1s_infinite]" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 rounded-full bg-perplexity-primary animate-[bounce_1s_infinite]" style={{ animationDelay: '0.4s' }} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAutoPilotModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 w-[600px] h-[600px] rounded-xl flex flex-col relative">
        <button
          onClick={() => setShowAutoPilot(false)}
          className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <span className="text-2xl leading-none opacity-60 hover:opacity-100">×</span>
        </button>

        <div className="px-16 pt-12 pb-8 border-b border-perplexity-primary/20">
          <div className="flex items-center justify-between relative">
            <div className={`flex-1 text-center ${step === 1 ? 'text-perplexity-primary' : 'text-gray-400'}`}>
              <div className="text-3xl font-medium mb-3">1</div>
              <div className="text-sm font-medium">Number of Articles</div>
            </div>
            <div className="absolute left-1/3 right-2/3 top-6 h-[2px] bg-gradient-to-r from-perplexity-primary/20 to-perplexity-primary/20" 
                 style={{ background: step > 1 ? 'var(--perplexity-primary)' : undefined }} />
            <div className={`flex-1 text-center ${step === 2 ? 'text-perplexity-primary' : 'text-gray-400'}`}>
              <div className="text-3xl font-medium mb-3">2</div>
              <div className="text-sm font-medium">Article Length</div>
            </div>
            <div className="absolute left-2/3 right-1/3 top-6 h-[2px] bg-gradient-to-r from-perplexity-primary/20 to-perplexity-primary/20"
                 style={{ background: step > 2 ? 'var(--perplexity-primary)' : undefined }} />
            <div className={`flex-1 text-center ${step === 3 ? 'text-perplexity-primary' : 'text-gray-400'}`}>
              <div className="text-3xl font-medium mb-3">3</div>
              <div className="text-sm font-medium">Topics</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {isGenerating ? renderProgress() : (
            <div className="h-full">
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
            </div>
          )}
        </div>

        {!isGenerating && (
          <div className="px-12 py-8 border-t border-perplexity-primary/20 flex justify-between">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 text-base text-perplexity-primary hover:opacity-80"
              >
                Back
              </button>
            ) : <div />}
            
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-6 py-3 text-base bg-perplexity-primary text-white rounded-lg hover:bg-perplexity-primary/90"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleGenerateArticles}
                disabled={isGenerating || config.selectedTopics.length === 0}
                className="px-6 py-3 text-base bg-perplexity-primary text-white rounded-lg hover:bg-perplexity-primary/90 disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : 'Generate Articles'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const formatDate = (dateValue: any) => {
    try {
      let date: Date;
      
      // Handle Firestore Timestamp
      if (dateValue && typeof dateValue === 'object' && 'seconds' in dateValue) {
        date = new Date(dateValue.seconds * 1000);
      }
      // Handle string
      else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      }
      // Handle Date object
      else if (dateValue instanceof Date) {
        date = dateValue;
      }
      else {
        throw new Error('Invalid date format');
      }

      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown Date';
    }
  };

  const renderArticleList = () => (
    <div className="space-y-4">
      {filteredArticles.map(article => (
        <div 
          key={article.id} 
          className="perplexipedia-card hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-medium">
                  {article.status === 'published' ? (
                    <a 
                      href={`/plexi/${article.slug || generateSlug(article.title)}`}
                      className="hover:text-perplexity-primary"
                    >
                      {article.title}
                    </a>
                  ) : (
                    article.title
                  )}
                </h3>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    article.status === 'published' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                    article.status === 'under_review' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' :
                    'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400'
                  }`}>
                    {article.status.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </span>
                  {article.isContribution && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                      Contribution
                    </span>
                  )}
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 line-clamp-2 font-serif mt-2">
                {article.content.slice(0, 200)}...
              </p>
              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                <span>{article.content.split(' ').length} words</span>
                <span>•</span>
                <span>Last modified: {formatDate(article.updatedAt)}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {article.isContribution && article.status === 'under_review' ? (
                <button
                  onClick={() => setPreviewArticle(article)}
                  className="btn-secondary text-sm flex items-center space-x-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  <span>Preview</span>
                </button>
              ) : (
                <button
                  onClick={() => navigate(`/dashboard/plexi/${article.slug || generateSlug(article.title)}/edit`)}
                  className="btn-secondary text-sm flex items-center space-x-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  <span>Edit</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Preview Modal */}
      {previewArticle && (
        <PreviewModal
          article={previewArticle}
          onClose={() => setPreviewArticle(null)}
        />
      )}
    </div>
  );

  const renderFilters = () => (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-500">Filter by:</span>
        <div className="flex space-x-2">
          {(['all', 'draft', 'under_review', 'published'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 rounded-full text-sm ${
                filterStatus === status
                  ? 'bg-perplexity-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {status === 'all' ? 'All' : status.split('_').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-500">Sort by:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 border-none focus:ring-2 focus:ring-perplexity-primary"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="a-z">A-Z</option>
          <option value="z-a">Z-A</option>
        </select>
      </div>
    </div>
  );

  const style = document.createElement('style');
  style.textContent = `
    @keyframes shimmer {
      0% { transform: translateX(-100%) }
      100% { transform: translateX(100%) }
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0) }
      50% { transform: translateY(-6px) }
    }
  `;
  document.head.appendChild(style);

  return (
    <div className="space-y-8">
      <div className="border-b border-perplexipedia-border pb-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-linux-libertine section-title">Your Contributions</h2>
            <p className="text-gray-600 dark:text-gray-400">Manage your article contributions</p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => navigate('/dashboard/plexi/new')}
              className="btn-primary"
            >
              New Article
            </button>
            <button
              onClick={() => setShowAutoPilot(true)}
              className="btn-secondary flex items-center space-x-2"
            >
              <span>AI Auto-Pilot</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M14.707 7.793a1 1 0 00-1.414 0L10 11.086l-3.293-3.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l4-4a1 1 0 000-1.414z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Replace existing filters with new combined filters and sort */}
      {renderFilters()}

      {/* Articles List */}
      {loading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-perplexity-primary"></div>
        </div>
      ) : filteredArticles.length > 0 ? (
        renderArticleList()
      ) : (
        <div className="text-center py-8 text-gray-500">
          No articles found. Start by creating one or using AI Auto-Pilot!
        </div>
      )}

      {/* Auto-Pilot Modal */}
      {showAutoPilot && renderAutoPilotModal()}
    </div>
  );
}; 