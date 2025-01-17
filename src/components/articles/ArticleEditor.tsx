import { useState, useCallback, useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';
import Select from 'react-select';
import { Article, ArticleStatus, ArticleTag, ArticleCategory } from '../../types/article';
import { useAI } from '../../hooks/useAI';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

interface ArticleEditorProps {
    article?: Article;
    onSave: (article: Partial<Article>) => void;
    categories: ArticleCategory[];
    tags: ArticleTag[];
}

export const ArticleEditor = ({ article, onSave, categories, tags }: ArticleEditorProps) => {
    const [title, setTitle] = useState(article?.title || '');
    const [content, setContent] = useState(article?.content || '');
    const [status, setStatus] = useState<ArticleStatus>(article?.status || 'draft');
    const [selectedCategories, setSelectedCategories] = useState<ArticleCategory[]>(
        article?.categories || []
    );
    const [selectedTags, setSelectedTags] = useState<ArticleTag[]>(
        article?.tags || []
    );
    const [aiSuggestions, setAISuggestions] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiEnabled, setAIEnabled] = useState(false);
    const { aiService, error: aiError } = useAI();
    const { currentUser } = useAuth();

    useEffect(() => {
        const loadAISettings = async () => {
            if (!currentUser) return;
            try {
                const docRef = doc(db, 'user_settings', currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const settings = docSnap.data();
                    setAIEnabled(settings.aiAssistEnabled || false);
                }
            } catch (error) {
                console.error('Error loading AI settings:', error);
            }
        };

        loadAISettings();
    }, [currentUser]);

    const handleSave = useCallback(() => {
        const articleData: Partial<Article> = {
            title,
            content,
            status,
            categories: selectedCategories,
            tags: selectedTags,
            updatedAt: new Date()
        };

        if (!article) {
            articleData.createdAt = new Date();
            articleData.versions = [{
                id: crypto.randomUUID(),
                content,
                author: currentUser?.displayName || currentUser?.email || 'unknown',
                timestamp: new Date(),
                changes: 'Initial version'
            }];
            articleData.currentVersion = articleData.versions[0].id;
        }

        onSave(articleData);
    }, [title, content, status, selectedCategories, selectedTags, article, onSave, currentUser]);

    const handleAIAssist = async () => {
        if (!aiService || !content) return;
        
        try {
            setIsGenerating(true);
            const { suggestions, improvedContent } = await aiService.suggestEdits(content);
            setAISuggestions(suggestions);
            if (improvedContent) {
                setContent(improvedContent);
            }
        } catch (error) {
            console.error('Error getting AI suggestions:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateArticle = async () => {
        if (!aiService || !title) return;
        
        try {
            setIsGenerating(true);
            const articleData = await aiService.generateArticle(title);
            if (articleData) {
                setContent(articleData.content || '');
                if (articleData.categories) setSelectedCategories(articleData.categories);
                if (articleData.tags) setSelectedTags(articleData.tags);
            }
        } catch (error) {
            console.error('Error generating article:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateRelated = async () => {
        if (!aiService || !title) return;
        
        try {
            setIsGenerating(true);
            const topics = await aiService.generateRelatedTopics(title);
            setAISuggestions(topics.map(topic => `Consider creating an article about: ${topic}`));
        } catch (error) {
            console.error('Error generating related topics:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-4 p-4">
            <div className="flex justify-between items-center">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Article Title"
                    className="text-2xl font-bold w-full p-2 border rounded"
                />
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ArticleStatus)}
                    className="ml-4 p-2 border rounded"
                >
                    <option value="draft">Draft</option>
                    <option value="under_review">Under Review</option>
                    <option value="published">Published</option>
                </select>
            </div>

            {aiEnabled && (
                <div className="flex space-x-2">
                    <button
                        onClick={handleGenerateArticle}
                        disabled={isGenerating || !title}
                        className="btn-secondary"
                    >
                        {isGenerating ? 'Generating...' : 'Generate Article'}
                    </button>
                    <button
                        onClick={handleAIAssist}
                        disabled={isGenerating || !content}
                        className="btn-secondary"
                    >
                        {isGenerating ? 'Analyzing...' : 'Get AI Suggestions'}
                    </button>
                    <button
                        onClick={handleGenerateRelated}
                        disabled={isGenerating || !title}
                        className="btn-secondary"
                    >
                        {isGenerating ? 'Generating...' : 'Suggest Related Topics'}
                    </button>
                </div>
            )}

            {aiError && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg">
                    {aiError}
                </div>
            )}

            {aiSuggestions.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">AI Suggestions</h3>
                    <ul className="list-disc pl-5 space-y-1">
                        {aiSuggestions.map((suggestion, index) => (
                            <li key={index} className="text-sm">{suggestion}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Categories</label>
                    <Select
                        isMulti
                        value={selectedCategories.map(cat => ({ value: cat.id, label: cat.name }))}
                        options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
                        onChange={(selected) => {
                            const selectedCats = selected.map(item => 
                                categories.find(cat => cat.id === item.value)!
                            );
                            setSelectedCategories(selectedCats);
                        }}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Tags</label>
                    <Select
                        isMulti
                        value={selectedTags.map(tag => ({ value: tag.id, label: tag.name }))}
                        options={tags.map(tag => ({ value: tag.id, label: tag.name }))}
                        onChange={(selected) => {
                            const selectedTagItems = selected.map(item => 
                                tags.find(tag => tag.id === item.value)!
                            );
                            setSelectedTags(selectedTagItems);
                        }}
                    />
                </div>
            </div>

            <div data-color-mode="light">
                <MDEditor
                    value={content}
                    onChange={(val) => setContent(val || '')}
                    height={500}
                    preview="edit"
                />
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Save {status === 'draft' ? 'Draft' : 'Article'}
                </button>
            </div>
        </div>
    );
}; 