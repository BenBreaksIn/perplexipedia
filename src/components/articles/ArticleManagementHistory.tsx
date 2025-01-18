import React from 'react';
import { Article } from '../../types/article';

interface ArticleManagementHistoryProps {
  article: Article;
  onRestoreVersion: (versionId: string) => Promise<void>;
}

export const ArticleManagementHistory: React.FC<ArticleManagementHistoryProps> = ({ article, onRestoreVersion }) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium">Version History</h2>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {article.versions.map((version) => (
          <div key={version.id} className="px-4 py-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm text-gray-500">
                  {formatDate(version.timestamp)}
                </div>
                <div className="text-sm text-gray-500">
                  by {version.author}
                </div>
                {version.changes && (
                  <div className="text-sm mt-1">{version.changes}</div>
                )}
              </div>
              {version.id !== article.currentVersion && (
                <button
                  onClick={() => onRestoreVersion(version.id)}
                  className="px-3 py-1 text-sm rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
                >
                  Restore this version
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 