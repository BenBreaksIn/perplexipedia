import React, { useState, useRef } from 'react';
import { Article, ArticleImage, InfoBox } from '../../types/article';
import ReactMarkdown from 'react-markdown';
import { useAI } from '../../hooks/useAI';

interface ArticleEditorProps {
  article?: Article;
  onSave: (article: Partial<Article>) => void;
}

export const ArticleEditor: React.FC<ArticleEditorProps> = ({
  article,
  onSave,
}) => {
  const [title, setTitle] = useState(article?.title || '');
  const [content, setContent] = useState(article?.content || '');
  const [selectedCategories, setSelectedCategories] = useState(article?.categories || []);
  const [selectedTags, setSelectedTags] = useState(article?.tags || []);
  const [status, setStatus] = useState(article?.status || 'draft');
  const [showPreview, setShowPreview] = useState(false);
  const [images, setImages] = useState<ArticleImage[]>(article?.images || []);
  const [infobox, setInfobox] = useState<InfoBox | undefined>(article?.infobox);
  const { generateArticle, suggestEdits, generateCategories, isLoading, error } = useAI();
  const [isGeneratingCategories, setIsGeneratingCategories] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Markdown toolbar handlers
  const insertMarkdown = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = content.substring(start, end);
    const beforeText = content.substring(0, start);
    const afterText = content.substring(end);
    
    const newText = `${beforeText}${prefix}${selectedText}${suffix}${afterText}`;
    setContent(newText);
    
    // Reset cursor position
    setTimeout(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        start + prefix.length,
        end + prefix.length
      );
    }, 0);
  };

  const markdownControls = [
    { icon: 'B', action: () => insertMarkdown('**', '**'), tooltip: 'Bold' },
    { icon: 'I', action: () => insertMarkdown('*', '*'), tooltip: 'Italic' },
    { icon: 'H1', action: () => insertMarkdown('# '), tooltip: 'Heading 1' },
    { icon: 'H2', action: () => insertMarkdown('## '), tooltip: 'Heading 2' },
    { icon: 'H3', action: () => insertMarkdown('### '), tooltip: 'Heading 3' },
    { icon: '🔗', action: () => insertMarkdown('[', '](url)'), tooltip: 'Link' },
    { icon: '📝', action: () => insertMarkdown('> '), tooltip: 'Quote' },
    { icon: '•', action: () => insertMarkdown('- '), tooltip: 'Bullet List' },
    { icon: '1.', action: () => insertMarkdown('1. '), tooltip: 'Numbered List' },
    { icon: '⌨️', action: () => insertMarkdown('`', '`'), tooltip: 'Inline Code' },
    { icon: '📦', action: () => insertMarkdown('```\n', '\n```'), tooltip: 'Code Block' },
    { icon: '―', action: () => insertMarkdown('\n---\n'), tooltip: 'Horizontal Rule' },
    { icon: '🖼️', action: () => insertMarkdown('![Alt text](', ')'), tooltip: 'Image' },
  ];

  const handleSave = () => {
    onSave({
      title,
      content,
      categories: selectedCategories,
      tags: selectedTags,
      status,
      images,
      infobox,
      categoriesLockedByAI: article?.categoriesLockedByAI
    });
  };

  const handleAIGenerate = async () => {
    if (!title) return;
    const result = await generateArticle(title);
    if (result) {
      setContent(result.content || '');
      setSelectedCategories(result.categories || []);
      setSelectedTags(result.tags || []);
      setImages(result.images || []);
      setInfobox(result.infobox);
    }
  };

  const handleGenerateCategories = async () => {
    if (!content) return;
    setIsGeneratingCategories(true);
    try {
      const aiCategories = await generateCategories(content);
      setSelectedCategories(aiCategories);
    } catch (error) {
      console.error('Error generating categories:', error);
    } finally {
      setIsGeneratingCategories(false);
    }
  };

  const handleAISuggest = async () => {
    if (!content) return;
    const suggestions = await suggestEdits(content);
    if (suggestions.improvedContent) {
      setContent(suggestions.improvedContent);
    }
  };

  const renderInfoBox = () => {
    if (!infobox) return null;
    const mainImage = images[infobox.image];

    return (
      <div className="float-right w-80 border border-gray-300 rounded-lg p-4 m-4 bg-gray-50">
        <h2 className="text-xl font-bold mb-2">{infobox.title}</h2>
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
            {Object.entries(infobox.key_facts).map(([label, value]) => (
              <tr key={label} className="border-t border-gray-200">
                <th className="py-2 pr-2 text-left text-gray-600">{label}</th>
                <td className="py-2 text-gray-900">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Article Title"
          className="text-2xl font-bold p-2 w-full border-b border-gray-300 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          {showPreview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {!showPreview ? (
        <>
          <div className="flex space-x-2">
            <button
              onClick={handleAIGenerate}
              disabled={isLoading || !title}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Generating...' : 'Generate with AI'}
            </button>
            <button
              onClick={handleAISuggest}
              disabled={isLoading || !content}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Get AI Suggestions
            </button>
            {!article?.categoriesLockedByAI && content && (
              <button
                onClick={handleGenerateCategories}
                disabled={isGeneratingCategories || !content}
                className="px-4 py-2 bg-perplexity-primary text-white rounded hover:bg-perplexity-secondary disabled:opacity-50 flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <span>{isGeneratingCategories ? 'Analyzing Content...' : 'Generate Categories'}</span>
              </button>
            )}
          </div>

          {/* Markdown Toolbar */}
          <div className="flex flex-wrap gap-2 p-2 bg-gray-100 rounded-t border border-gray-300">
            {markdownControls.map((control, index) => (
              <button
                key={index}
                onClick={control.action}
                className="p-2 hover:bg-gray-200 rounded"
                title={control.tooltip}
              >
                {control.icon}
              </button>
            ))}
          </div>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your article content here... (Markdown supported)"
            className="w-full h-96 p-4 border rounded-b focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />

          {selectedCategories.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg">Article Categories</h3>
                {article?.categoriesLockedByAI && (
                  <span className="text-sm text-gray-500 italic flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    AI-Generated Categories
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedCategories.map((category) => (
                  <span
                    key={category.id}
                    className="px-3 py-1 bg-white dark:bg-gray-700 rounded-full text-sm flex items-center"
                  >
                    {category.name}
                    {!article?.categoriesLockedByAI && (
                      <button
                        onClick={() => setSelectedCategories(selectedCategories.filter(c => c.id !== category.id))}
                        className="ml-2 text-gray-400 hover:text-red-500"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-bold mb-2">Status</h3>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Article['status'])}
              className="w-full p-2 border rounded"
            >
              <option value="draft">Draft</option>
              <option value="under_review">Under Review</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </>
      ) : (
        <div className="prose max-w-none">
          <div className="wiki-article">
            {renderInfoBox()}
            <ReactMarkdown>{content}</ReactMarkdown>
            {images.length > 0 && (
              <div className="mt-8">
                <h2>Images</h2>
                <div className="grid grid-cols-2 gap-4">
                  {images.map((image, index) => (
                    <figure key={index} className="border rounded p-2">
                      <img
                        src={image.url}
                        alt={image.description}
                        className="w-full h-48 object-cover rounded"
                      />
                      <figcaption className="text-sm text-gray-500 mt-2">
                        {image.description}
                        <br />
                        <span className="text-xs">{image.attribution}</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-red-500">{error}</p>}

      <div className="flex justify-end space-x-4">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save
        </button>
      </div>
    </div>
  );
}; 