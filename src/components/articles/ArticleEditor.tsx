import { useState, useCallback } from 'react';
import MDEditor from '@uiw/react-md-editor';
import Select from 'react-select';
import { Article, ArticleStatus, ArticleTag, ArticleCategory } from '../../types/article';

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
                author: 'current-user', // TODO: Get from auth context
                timestamp: new Date(),
                changes: 'Initial version'
            }];
            articleData.currentVersion = articleData.versions[0].id;
        }

        onSave(articleData);
    }, [title, content, status, selectedCategories, selectedTags, article, onSave]);

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