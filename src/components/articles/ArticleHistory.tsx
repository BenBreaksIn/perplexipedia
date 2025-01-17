import { useState } from 'react';
import { marked } from 'marked';
import { Article, ArticleVersion } from '../../types/article';

interface ArticleHistoryProps {
    article: Article;
    onRestoreVersion: (versionId: string) => void;
}

export const ArticleHistory = ({ article, onRestoreVersion }: ArticleHistoryProps) => {
    const [selectedVersion, setSelectedVersion] = useState<ArticleVersion | null>(null);

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleString();
    };

    return (
        <div className="grid grid-cols-12 gap-4 p-4">
            <div className="col-span-4 border-r pr-4">
                <h3 className="text-xl font-bold mb-4">Version History</h3>
                <div className="space-y-2">
                    {article.versions.map((version) => (
                        <div
                            key={version.id}
                            className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                                selectedVersion?.id === version.id ? 'bg-blue-50 border-blue-500' : ''
                            }`}
                            onClick={() => setSelectedVersion(version)}
                        >
                            <div className="flex justify-between items-center">
                                <span className="font-medium">{version.author}</span>
                                <span className="text-sm text-gray-500">
                                    {formatDate(version.timestamp)}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{version.changes}</p>
                            {version.id !== article.currentVersion && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRestoreVersion(version.id);
                                    }}
                                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                                >
                                    Restore this version
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="col-span-8">
                <h3 className="text-xl font-bold mb-4">
                    {selectedVersion ? 'Version Preview' : 'Select a version to preview'}
                </h3>
                {selectedVersion && (
                    <div className="prose max-w-none">
                        <div
                            dangerouslySetInnerHTML={{
                                __html: marked(selectedVersion.content)
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}; 