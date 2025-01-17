import { useState } from 'react';
import { ArticleManagement } from '../articles/ArticleManagement';

export const DashboardContributions = () => {
    const [showNewArticle, setShowNewArticle] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Your Contributions</h2>
                <button
                    onClick={() => setShowNewArticle(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Create New Article
                </button>
            </div>

            {showNewArticle ? (
                <ArticleManagement />
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-semibold">Recent Contributions</h3>
                        <div className="flex space-x-4">
                            <button className="text-blue-600 hover:text-blue-800">
                                View All
                            </button>
                            <button className="text-blue-600 hover:text-blue-800">
                                View Drafts
                            </button>
                        </div>
                    </div>

                    {/* Placeholder for contributions list */}
                    <div className="space-y-4">
                        <p className="text-gray-500 italic">
                            No contributions yet. Start by creating a new article!
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}; 