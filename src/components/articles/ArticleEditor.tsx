import React, { useState } from 'react';
import { Article, ArticleImage, InfoBox } from '../../types/article';
import ReactMarkdown from 'react-markdown';
import { useAI } from '../../hooks/useAI';

interface ArticleEditorProps {
  article?: Article;
  onSave: (article: Partial<Article>) => void;
  categories: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string }>;
}

export const ArticleEditor: React.FC<ArticleEditorProps> = ({
  article,
  onSave,
  categories,
  tags,
}) => {
  const [title, setTitle] = useState(article?.title || '');
  const [content, setContent] = useState(article?.content || '');
  const [selectedCategories, setSelectedCategories] = useState(article?.categories || []);
  const [selectedTags, setSelectedTags] = useState(article?.tags || []);
  const [status, setStatus] = useState(article?.status || 'draft');
  const [showPreview, setShowPreview] = useState(false);
  const [images, setImages] = useState<ArticleImage[]>(article?.images || []);
  const [infobox, setInfobox] = useState<InfoBox | undefined>(article?.infobox);
  const { generateArticle, suggestEdits, isLoading, error } = useAI();

  const handleSave = () => {
    onSave({
      title,
      content,
      categories: selectedCategories,
      tags: selectedTags,
      status,
      images,
      infobox
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
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your article content here... (Markdown supported)"
            className="w-full h-96 p-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-bold mb-2">Categories</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <label key={category.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedCategories.some((c) => c.id === category.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategories([...selectedCategories, category]);
                        } else {
                          setSelectedCategories(
                            selectedCategories.filter((c) => c.id !== category.id)
                          );
                        }
                      }}
                      className="mr-2"
                    />
                    {category.name}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-2">Tags</h3>
              <div className="space-y-2">
                {tags.map((tag) => (
                  <label key={tag.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTags.some((t) => t.id === tag.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTags([...selectedTags, tag]);
                        } else {
                          setSelectedTags(
                            selectedTags.filter((t) => t.id !== tag.id)
                          );
                        }
                      }}
                      className="mr-2"
                    />
                    {tag.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

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