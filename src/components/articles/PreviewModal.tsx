import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Article } from '../../types/article';

interface PreviewModalProps {
  article: Partial<Article>;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ article, onClose }) => {
  const renderInfoBox = () => {
    if (!article.infobox) return null;
    const mainImage = article.images?.[article.infobox.image];

    return (
      <div className="float-right w-full sm:w-64 md:w-72 lg:w-80 border border-gray-300 rounded-lg p-4 sm:p-4 m-2 sm:m-4 bg-gray-50 dark:bg-gray-800">
        <h2 className="text-xl sm:text-xl lg:text-2xl font-bold mb-3">{article.infobox.title}</h2>
        {mainImage && (
          <div className="mb-4">
            <img
              src={mainImage.url}
              alt={mainImage.description}
              className="w-full rounded"
            />
            <p className="text-sm text-gray-500 mt-2">{mainImage.attribution}</p>
          </div>
        )}
        <table className="w-full">
          <tbody>
            {Object.entries(article.infobox.key_facts).map(([label, value]) => (
              <tr key={label} className="border-t border-gray-200 dark:border-gray-700">
                <th className="py-3 pr-3 text-left text-gray-600 dark:text-gray-400 align-top text-base">{label}</th>
                <td className="py-3 text-gray-900 dark:text-gray-100 text-base">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderImages = () => {
    if (!article.images || article.images.length === 0) return null;
    
    // Skip the main image if it's used in the infobox
    const infoboxImageIndex = article.infobox?.image;
    const displayImages = article.images.filter((_, index) => index !== infoboxImageIndex);
    
    if (displayImages.length === 0) return null;

    return (
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayImages.map((image, index) => (
          <figure key={index} className="border dark:border-gray-700 rounded-lg p-3">
            <img
              src={image.url}
              alt={image.description}
              className="w-full h-48 object-cover rounded-lg"
            />
            <figcaption className="mt-3">
              <p className="text-base text-gray-900 dark:text-gray-100">{image.description}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{image.attribution}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    );
  };

  const components = {
    h1: ({ children }: any) => <h1 className="text-4xl font-linux-libertine mb-4 section-title">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-3xl font-linux-libertine mb-3 mt-6 section-title">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-2xl font-linux-libertine mb-2 mt-5 section-title">{children}</h3>,
    h4: ({ children }: any) => <h4 className="text-xl font-linux-libertine mb-2 mt-4 section-title">{children}</h4>,
    h5: ({ children }: any) => <h5 className="text-lg font-linux-libertine mb-2 mt-4 section-title">{children}</h5>,
    h6: ({ children }: any) => <h6 className="text-base font-linux-libertine mb-2 mt-4 section-title">{children}</h6>,
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start overflow-y-auto">
      <div className="container !max-w-[1672px] mx-auto px-4 py-8">
        <main className="bg-white dark:bg-gray-900 rounded-lg shadow-xl">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-4xl font-linux-libertine section-title">{article.title}</h1>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <article className="prose dark:prose-invert max-w-none prose-headings:font-linux-libertine prose-headings:section-title">
              {renderInfoBox()}
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                rehypePlugins={[rehypeRaw]}
                components={components}
              >
                {article.content || ''}
              </ReactMarkdown>
              {renderImages()}
            </article>
          </div>
        </main>
      </div>
    </div>
  );
}; 