import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAI } from '../../hooks/useAI';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Article, ArticleStatus } from '../../types/article';

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
  const { generateArticles, isLoading } = useAI();
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

  const addTopic = (topic: string) => {
    const trimmedTopic = topic.trim();
    if (trimmedTopic && !config.selectedTopics.includes(trimmedTopic)) {
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
      const articlesRef = collection(db, 'articles');
      const q = query(articlesRef, where('authorId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      const loadedArticles = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Article[];
      setArticles(loadedArticles);
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGeneration = async () => {
    if (isLoading || !config.selectedTopics.length || !currentUser) {
      setError('Please select at least one topic');
      return;
    }
    
    setError(null);
    setIsGenerating(true);
    setProgress(0);
    const totalArticles = config.numberOfArticles;
    let generatedCount = 0;
    const maxRetries = 3; // Maximum number of retries per topic

    try {
      // Generate one article at a time, cycling through topics if needed
      while (generatedCount < totalArticles) {
        // Get the current topic (cycle through topics if needed)
        const topicIndex = generatedCount % config.selectedTopics.length;
        const currentTopic = config.selectedTopics[topicIndex];
        let retryCount = 0;
        let success = false;
        
        while (retryCount < maxRetries && !success) {
          console.log(`Generating article ${generatedCount + 1} of ${totalArticles} for topic: ${currentTopic} (Attempt ${retryCount + 1})`);
          
          // Generate just one article for this topic
          const articles = await generateArticles(currentTopic, 1);
          
          if (articles && articles.length > 0) {
            const result = articles[0];
            const now = new Date();
            const articleId = crypto.randomUUID();
            await setDoc(doc(db, 'articles', articleId), {
              ...result,
              id: articleId,
              authorId: currentUser.uid,
              createdAt: now.toISOString(),
              updatedAt: now.toISOString(),
              status: 'draft'
            });
            generatedCount++;
            setProgress((generatedCount / totalArticles) * 100);
            success = true;
            setError(null);
          } else {
            retryCount++;
            if (retryCount < maxRetries) {
              setError(`Retrying article generation for "${currentTopic}" (Attempt ${retryCount + 1} of ${maxRetries})`);
              // Wait a short moment before retrying
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              setError(`Failed to generate article for "${currentTopic}" after ${maxRetries} attempts. Moving to next topic...`);
              // Wait a moment before moving to next topic
              await new Promise(resolve => setTimeout(resolve, 2000));
              break;
            }
          }
        }
      }

      if (generatedCount === 0) {
        setError('No articles were generated. Please try again with different topics.');
        return;
      }

      if (generatedCount < totalArticles) {
        setError(`Generated ${generatedCount} out of ${totalArticles} requested articles. Some topics failed.`);
      }

      // Reload articles to show new ones
      await loadArticles();

      // Only close the modal if we generated at least one article
      if (generatedCount > 0) {
        // Reset auto-pilot
        setShowAutoPilot(false);
        setStep(1);
        setConfig({
          numberOfArticles: 1,
          minWordCount: 500,
          maxWordCount: 2000,
          selectedTopics: []
        });
      }
    } catch (error) {
      console.error('Error generating articles:', error);
      setError('Failed to generate articles. Please try again.');
    } finally {
      setIsGenerating(false);
      if (!error) {
        setProgress(0);
      }
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
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Number of Articles</label>
        <input
          type="number"
          min="1"
          max="10"
          value={config.numberOfArticles}
          onChange={(e) => setConfig(prev => ({ ...prev, numberOfArticles: parseInt(e.target.value) || 1 }))}
          className="search-input w-full"
        />
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => setStep(2)}
          className="btn-primary"
        >
          Next
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Word Count Range</label>
        <div className="flex space-x-4">
          <div className="flex-1">
            <label className="block text-sm text-gray-500 mb-1">Minimum</label>
            <input
              type="number"
              min="100"
              max="5000"
              step="100"
              value={config.minWordCount}
              onChange={(e) => setConfig(prev => ({ ...prev, minWordCount: parseInt(e.target.value) || 500 }))}
              className="search-input w-full"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-500 mb-1">Maximum</label>
            <input
              type="number"
              min="100"
              max="5000"
              step="100"
              value={config.maxWordCount}
              onChange={(e) => setConfig(prev => ({ ...prev, maxWordCount: parseInt(e.target.value) || 2000 }))}
              className="search-input w-full"
            />
          </div>
        </div>
      </div>
      <div className="flex justify-between">
        <button
          onClick={() => setStep(1)}
          className="btn-secondary"
        >
          Back
        </button>
        <button
          onClick={() => setStep(3)}
          className="btn-primary"
        >
          Next
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">What would you like to write about?</label>
        <div className="space-y-4">
          {/* Selected Topics Tags */}
          <div className="flex flex-wrap gap-2">
            {config.selectedTopics.map(topic => (
              <span
                key={topic}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-perplexity-primary/10 text-perplexity-primary"
              >
                {topic}
                <button
                  onClick={() => removeTopic(topic)}
                  className="ml-2 hover:text-red-500 transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          {/* Topic Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Enter any topic you're interested in (e.g., 'dogs', 'space', 'history')"
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
              className="search-input w-full"
            />
            <p className="mt-1 text-xs text-gray-500">
              Press Enter after each topic. Our AI will handle the rest!
            </p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setStep(2)}
          className="btn-secondary"
        >
          Back
        </button>
        <button
          onClick={handleStartGeneration}
          disabled={isGenerating || config.selectedTopics.length === 0}
          className="btn-primary"
        >
          {isGenerating ? 'Generating...' : 'Start Generation'}
        </button>
      </div>
    </div>
  );

  const renderProgress = () => (
    <div className="space-y-4">
      <div className="relative pt-1">
        <div className="flex mb-2 items-center justify-between">
          <div>
            <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-perplexity-primary bg-perplexity-primary/10">
              Progress
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold inline-block text-perplexity-primary">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-perplexity-primary/10">
          <div
            style={{ width: `${progress}%` }}
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-perplexity-primary transition-all duration-500"
          />
        </div>
      </div>
      <p className="text-center text-sm text-gray-500">
        {error ? (
          <span className="text-red-500">{error}</span>
        ) : (
          'Generating articles... Please wait.'
        )}
      </p>
      {error && (
        <div className="flex justify-center">
          <button
            onClick={() => {
              setError(null);
              setIsGenerating(false);
            }}
            className="btn-secondary text-sm"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );

  const renderAutoPilotModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">AI Auto-Pilot</h3>
          <button
            onClick={() => setShowAutoPilot(false)}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ×
          </button>
        </div>

        {isGenerating ? (
          renderProgress()
        ) : (
          <div className="space-y-6">
            {/* Progress indicator */}
            <div className="flex justify-center">
              <div className="flex items-center space-x-4">
                {[1, 2, 3].map((stepNumber) => (
                  <div key={stepNumber} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        step === stepNumber
                          ? 'bg-perplexity-primary text-white'
                          : step > stepNumber
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {step > stepNumber ? '✓' : stepNumber}
                    </div>
                    {stepNumber < 3 && (
                      <div
                        className={`w-12 h-1 ${
                          step > stepNumber ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step content */}
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
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
            <div className="space-y-2 flex-1">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-medium">
                  {article.status === 'published' ? (
                    <a 
                      href={`/articles/${article.id}`}
                      className="hover:text-perplexity-primary"
                    >
                      {article.title}
                    </a>
                  ) : (
                    article.title
                  )}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  article.status === 'published' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                  article.status === 'under_review' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' :
                  'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400'
                }`}>
                  {article.status.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 line-clamp-2 font-serif">
                {article.content.slice(0, 200)}...
              </p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{article.content.split(' ').length} words</span>
                <span>•</span>
                <span>Last modified: {formatDate(article.updatedAt)}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate(`/dashboard/articles/${article.id}/edit`)}
                className="btn-secondary text-sm flex items-center space-x-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                <span>Edit</span>
              </button>
            </div>
          </div>
        </div>
      ))}
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
              onClick={() => navigate('/dashboard/articles/new')}
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