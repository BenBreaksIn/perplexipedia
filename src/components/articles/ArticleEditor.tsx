import React, { useState, useRef } from 'react';
import { Article, ArticleImage, InfoBox } from '../../types/article';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useAI } from '../../hooks/useAI';
import { useAdmin } from '../../hooks/useAdmin';
import { Header } from '../Header';
import { Sidebar } from '../Sidebar';
import { Footer } from '../Footer';

interface ArticleEditorProps {
  article?: Article;
  onSave: (article: Partial<Article>) => void;
}

export const ArticleEditor: React.FC<ArticleEditorProps> = ({
  article,
  onSave,
}) => {
  const { isAdmin } = useAdmin();

  const formatInfoBoxMarkdown = (infobox: InfoBox | undefined, articleImages: ArticleImage[]) => {
    if (!infobox) return '';
    
    let markdown = '| Info Box |\n|-|\n';
    markdown += `| **${infobox.title}** |\n`;
    if (articleImages && articleImages[infobox.image]) {
      const image = articleImages[infobox.image];
      markdown += `| ![${image.description}](${image.url}) |\n`;
      markdown += `| *${image.attribution}* |\n`;
    }
    for (const [key, value] of Object.entries(infobox.key_facts)) {
      markdown += `| **${key}**: ${value} |\n`;
    }
    markdown += '\n';
    return markdown;
  };

  const [title, setTitle] = useState(article?.title || '');
  const [content, setContent] = useState(() => {
    if (article?.infobox) {
      const infoboxMarkdown = formatInfoBoxMarkdown(article.infobox, article.images || []);
      return infoboxMarkdown + (article?.content || '');
    }
    return article?.content || '';
  });
  const [selectedCategories, setSelectedCategories] = useState(article?.categories || []);
  const [selectedTags, setSelectedTags] = useState(article?.tags || []);
  const [status, setStatus] = useState(article?.status || 'draft');
  const [showPreview, setShowPreview] = useState(false);
  const [images, setImages] = useState<ArticleImage[]>(article?.images || []);
  const [infobox, setInfobox] = useState<InfoBox | undefined>(article?.infobox);
  const { generateArticle, generateCategories, expandContent, isLoading, error } = useAI();
  const [isGeneratingCategories, setIsGeneratingCategories] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [editSummary, setEditSummary] = useState('');

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

  const insertInfoBoxTemplate = () => {
    const template = `| Info Box |
|-|
| **Article Title** |
| ![Image Description](image_url) |
| *Image Attribution* |
| **Born**: [Birth Date] |
| **Occupation**: [Occupation] |
| **Known For**: [Notable Achievements] |
| **Education**: [Education Details] |

`;
    // Insert at the beginning of the content
    setContent(template + content);
  };

  const hasInfoBox = (content: string) => {
    return content.includes('| Info Box |') && content.includes('|-|');
  };

  const markdownControls = [
    { icon: '📋', action: insertInfoBoxTemplate, tooltip: 'Insert Info Box Template' },
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
      categoriesLockedByAI: article?.categoriesLockedByAI,
      ...(status === 'submit_revision' && {
        versions: [
          ...(article?.versions || []),
          {
            id: Date.now().toString(),
            content,
            author: article?.author || '',
            timestamp: new Date(),
            changes: editSummary
          }
        ]
      })
    });
    if (status === 'submit_revision') {
      setEditSummary('');
    }
  };

  const handleAIGenerate = async () => {
    if (!title) return;
    const result = await generateArticle(title);
    if (result) {
      const infoboxMarkdown = formatInfoBoxMarkdown(result.infobox, result.images || []);

      // If there's existing content, use it as context for the generation
      if (content.trim()) {
        const combinedContent = result.content?.split('\n') || [];
        // Remove any title line and empty lines at the start
        while (combinedContent.length > 0 && 
          (combinedContent[0].trim().startsWith('# ') || 
           combinedContent[0].trim() === '')) {
          combinedContent.shift();
        }
        setContent(content + '\n\n' + infoboxMarkdown + combinedContent.join('\n').trim());
      } else {
        setContent(infoboxMarkdown + (result.content || ''));
      }
      
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

  const handleExpandContent = async () => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = content.substring(start, end);
    
    if (!selectedText) {
      alert('Please select the text you want to expand');
      return;
    }

    // Get surrounding context (500 characters before and after)
    const contextStart = Math.max(0, start - 500);
    const contextEnd = Math.min(content.length, end + 500);
    const context = content.substring(contextStart, contextEnd);

    setIsExpanding(true);
    try {
      const result = await expandContent(selectedText, context);
      if (result.expandedContent) {
        const beforeText = content.substring(0, start);
        const afterText = content.substring(end);
        setContent(`${beforeText}${result.expandedContent}${afterText}`);
      }
    } catch (error) {
      console.error('Error expanding content:', error);
    } finally {
      setIsExpanding(false);
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

  const handleSubmitArticle = () => {
    if (!hasInfoBox(content) && !isAdmin) {
      if (!window.confirm('This article does not have an info box. Info boxes are required for all articles. Would you like to add one now?')) {
        return;
      }
      insertInfoBoxTemplate();
      return;
    }
    setStatus('under_review');
    handleSave();
  };

  const parseInfoBoxFromMarkdown = (content: string): InfoBox | undefined => {
    const lines = content.split('\n');
    let infoBoxLines: string[] = [];
    let isInInfoBox = false;
    
    // Extract info box lines
    for (const line of lines) {
      if (line.includes('| Info Box |')) {
        isInInfoBox = true;
        infoBoxLines.push(line);
        continue;
      }
      if (isInInfoBox) {
        if (line.trim() === '') {
          break;
        }
        infoBoxLines.push(line);
      }
    }

    if (infoBoxLines.length < 3) return undefined;

    const key_facts: Record<string, string> = {};
    let title = '';
    let imageIndex = -1;

    // Parse the lines
    for (let i = 2; i < infoBoxLines.length; i++) {
      const line = infoBoxLines[i].trim();
      if (!line || line === '|-|') continue;

      // Remove table markers and trim
      const content = line.replace(/^\||\|$/g, '').trim();

      if (content.startsWith('**') && content.endsWith('**')) {
        // This is the title
        title = content.replace(/^\*\*|\*\*$/g, '');
      } else if (content.startsWith('![')) {
        // This is the image - we'll use the first image in the article
        imageIndex = 0;
      } else if (content.startsWith('**')) {
        // This is a key-value pair
        const match = content.match(/^\*\*([^*]+)\*\*:\s*(.+)$/);
        if (match) {
          key_facts[match[1]] = match[2];
        }
      }
    }

    if (!title) return undefined;

    return {
      title,
      image: imageIndex,
      key_facts
    };
  };

  const handlePreview = () => {
    // Parse the info box from markdown when entering preview mode
    const parsedInfoBox = parseInfoBoxFromMarkdown(content);
    if (parsedInfoBox) {
      setInfobox(parsedInfoBox);
    }
    setShowPreview(true);
    // Prevent background scroll
    document.body.style.overflow = 'hidden';
  };

  const closePreview = () => {
    setShowPreview(false);
    // Restore background scroll
    document.body.style.overflow = 'auto';
  };

  const filterInfoBoxFromContent = (content: string): string => {
    const lines = content.split('\n');
    let isInInfoBox = false;
    let skipCount = 0;
    
    // Find where the info box ends
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('| Info Box |')) {
        isInInfoBox = true;
        skipCount = i;
        continue;
      }
      if (isInInfoBox && line.trim() === '') {
        skipCount = i + 1;
        break;
      }
    }
    
    // Return content without the info box
    return lines.slice(skipCount).join('\n').trim();
  };

  return (
    <>
      <div className={`space-y-4 ${showPreview ? 'hidden' : ''}`}>
        <div className="flex justify-between items-center">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article Title"
            className="text-2xl font-bold p-2 w-full border-b border-gray-300 focus:outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-700"
            disabled={article?.status === 'published'}
          />
        </div>

        {!showPreview && (
          <>
            <div className="flex space-x-2">
              <button
                onClick={handleAIGenerate}
                disabled={isLoading || !title}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                title="Generate an article based on the title. If you've added content, it will be preserved and used as context for additional content generation."
              >
                {isLoading ? 'Generating...' : 'Generate with AI'}
              </button>
              <button
                onClick={handleExpandContent}
                disabled={isExpanding}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                title="Select a section of text to expand it with more detailed information while maintaining the same style and format"
              >
                {isExpanding ? 'Expanding...' : 'Expand Selection'}
              </button>
              <button
                onClick={handleGenerateCategories}
                disabled={isGeneratingCategories || !content || article?.categoriesLockedByAI}
                className="px-4 py-2 bg-perplexity-primary text-white rounded hover:bg-perplexity-secondary disabled:opacity-50 flex items-center space-x-2"
                title="Analyze the article content and generate appropriate categories based on the subject matter"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <span>{isGeneratingCategories ? 'Analyzing Content...' : 'Generate Categories'}</span>
              </button>
              <button
                onClick={handlePreview}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 flex items-center space-x-2"
                title="Toggle preview mode"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                <span>Preview</span>
              </button>
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

            {article?.status !== 'published' && (
              <div className="flex justify-end space-x-4">
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save Draft
                </button>
                <button
                  onClick={handleSubmitArticle}
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Submit Article
                </button>
              </div>
            )}
          </>
        )}

        {error && <p className="text-red-500">{error}</p>}

        {article?.status === 'published' && (
          <div className="border-t pt-4">
            <label htmlFor="editSummary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Edit Summary
            </label>
            <input
              id="editSummary"
              type="text"
              value={editSummary}
              onChange={(e) => setEditSummary(e.target.value)}
              placeholder="Briefly describe your changes..."
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div className="flex justify-end space-x-4">
          {article?.status === 'published' ? (
            <>
              <a
                href={`/plexi/${article.slug}/history`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                History
              </a>
              <button
                onClick={() => setShowPreview(true)}
                className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Preview Revision
              </button>
              <button
                onClick={() => {
                  setStatus('submit_revision');
                  handleSave();
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={!editSummary.trim()}
                title={!editSummary.trim() ? 'Please provide an edit summary' : ''}
              >
                Submit Revision
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Preview Mode */}
      <div className={`space-y-4 ${!showPreview ? 'hidden' : ''}`}>
        <div className="perplexipedia-card">
          <article className="prose dark:prose-invert max-w-none">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6">{title}</h1>
            {infobox && renderInfoBox()}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              className="markdown-content"
            >
              {filterInfoBoxFromContent(content)}
            </ReactMarkdown>
          </article>
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 bg-perplexipedia-bg z-50 overflow-hidden">
          <button
            onClick={closePreview}
            className="fixed top-20 left-4 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 z-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            <span>Back to Editor</span>
          </button>
          <div className="h-screen overflow-auto">
            <div className="min-h-screen flex flex-col">
              <Header />
              <div className="container !max-w-[1672px] mx-auto px-4 py-8 flex flex-1">
                <Sidebar />
                <main className="flex-1 transition-all duration-300 ease-in-out">
                  <div className="perplexipedia-card">
                    <article className="prose dark:prose-invert max-w-none">
                      <h1 className="text-4xl font-bold mb-4">{title}</h1>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-8 space-x-4">
                        <span>By {article?.author || 'Anonymous'}</span>
                        <span>•</span>
                        <span>Last updated: {new Date().toLocaleDateString()}</span>
                      </div>
                      <div className="perplexipedia-article">
                        {renderInfoBox()}
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]} 
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            h1: ({node, ...props}) => <h1 className="text-4xl font-bold mt-8 mb-4" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-3xl font-bold mt-6 mb-3" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-2xl font-bold mt-5 mb-2" {...props} />,
                            p: ({node, children, ...props}) => {
                              // Check if the paragraph only contains an image
                              const childrenArray = React.Children.toArray(children);
                              if (childrenArray.length === 1 && 
                                  React.isValidElement(childrenArray[0]) && 
                                  childrenArray[0].type === 'img') {
                                // Return the image element directly
                                return childrenArray[0];
                              }
                              return <p className="mb-4" {...props}>{children}</p>;
                            },
                            ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 ml-4" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 ml-4" {...props} />,
                            li: ({node, ...props}) => <li className="mb-1" {...props} />,
                            blockquote: ({node, ...props}) => (
                              <blockquote className="border-l-4 border-gray-300 pl-4 my-4 italic" {...props} />
                            ),
                            img: ({node, alt, src, ...props}) => (
                              <img
                                src={src}
                                alt={alt}
                                className="max-w-full h-auto rounded-lg mx-auto my-8"
                                {...props}
                              />
                            ),
                            a: ({node, href, ...props}) => (
                              <a
                                href={href}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                target="_blank"
                                rel="noopener noreferrer"
                                {...props}
                              />
                            ),
                            table: ({node, ...props}) => (
                              <div className="overflow-x-auto my-4">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" {...props} />
                              </div>
                            ),
                            th: ({node, ...props}) => (
                              <th className="px-6 py-3 bg-gray-50 dark:bg-gray-800 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" {...props} />
                            ),
                            td: ({node, ...props}) => (
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100" {...props} />
                            ),
                            code: ({node, ...props}) => (
                              props.className?.includes('inline') ? (
                                <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm" {...props} />
                              ) : (
                                <code className="block bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm" {...props} />
                              )
                            )
                          }}
                        >
                          {filterInfoBoxFromContent(content)}
                        </ReactMarkdown>
                        {images && images.length > 0 && (
                          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {images
                              .filter((_, index) => index !== infobox?.image)
                              .map((image, index) => (
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
                        )}
                      </div>
                    </article>
                  </div>
                </main>
              </div>
              <Footer />
            </div>
          </div>
        </div>
      )}
    </>
  );
}; 