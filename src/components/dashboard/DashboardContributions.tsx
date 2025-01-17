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

export const DashboardContributions = () => {
  const navigate = useNavigate();
  const { generateArticle, isLoading } = useAI();
  const { currentUser } = useAuth();
  const [showAutoPilot, setShowAutoPilot] = useState(false);
  const [step, setStep] = useState(1);
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
    if (isLoading || !config.selectedTopics.length || !currentUser) return;
    
    setIsGenerating(true);
    setProgress(0);
    const totalArticles = config.numberOfArticles;
    let generatedCount = 0;

    try {
      for (let i = 0; i < config.selectedTopics.length && generatedCount < totalArticles; i++) {
        const topic = config.selectedTopics[i];
        const result = await generateArticle(topic);
        if (result) {
          // Save the article to Firestore
          const articleId = crypto.randomUUID();
          await setDoc(doc(db, 'articles', articleId), {
            ...result,
            id: articleId,
            authorId: currentUser.uid,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'draft'
          });
          generatedCount++;
          setProgress((generatedCount / totalArticles) * 100);
        }
      }

      // Reload articles to show new ones
      await loadArticles();

      // Reset auto-pilot
      setShowAutoPilot(false);
      setStep(1);
      setConfig({
        numberOfArticles: 1,
        minWordCount: 500,
        maxWordCount: 2000,
        selectedTopics: []
      });
    } catch (error) {
      console.error('Error generating articles:', error);
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const filteredArticles = articles.filter(article => 
    filterStatus === 'all' ? true : article.status === filterStatus
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
        <label className="block text-sm font-medium mb-2">Select Topics</label>
        <div className="space-y-2">
          {/* Here you would map through available topics from AI settings */}
          {/* For now, let's add a simple input */}
          <input
            type="text"
            placeholder="Enter topics (comma-separated)"
            onChange={(e) => setConfig(prev => ({ ...prev, selectedTopics: e.target.value.split(',').map(t => t.trim()) }))}
            className="search-input w-full"
          />
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
          Start Generation
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
        Generating articles... Please wait.
      </p>
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

  return (
    <div className="space-y-8">
      <div className="border-b border-wiki-border pb-4">
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

      {/* Filters */}
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

      {/* Articles List */}
      {loading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-perplexity-primary"></div>
        </div>
      ) : filteredArticles.length > 0 ? (
        <div className="space-y-4">
          {filteredArticles.map(article => (
            <div key={article.id} className="wiki-card hover:shadow-md transition-shadow border-l-4 pl-4" style={{
              borderLeftColor: article.status === 'published' ? '#22c55e' : 
                             article.status === 'under_review' ? '#eab308' : 
                             '#94a3b8'
            }}>
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-xl font-linux-libertine hover:text-perplexity-primary">
                      {article.title}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      article.status === 'published' ? 'bg-green-100 text-green-800' :
                      article.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
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
                    <span>Last modified: {new Date(article.updatedAt).toLocaleDateString()}</span>
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