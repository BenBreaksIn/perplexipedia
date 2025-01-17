import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-wiki-border mt-8">
      <div className="container mx-auto px-4 py-6">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="section-title mb-4">About Perplexipedia</h3>
            <ul className="space-y-2">
              <li><a href="#" className="nav-link">About</a></li>
              <li><a href="#" className="nav-link">Community Portal</a></li>
              <li><a href="#" className="nav-link">Statistics</a></li>
            </ul>
          </div>
          <div>
            <h3 className="section-title mb-4">Contribute</h3>
            <ul className="space-y-2">
              <li><a href="#" className="nav-link">Help</a></li>
              <li><a href="#" className="nav-link">Learn to Edit</a></li>
              <li><a href="#" className="nav-link">Community Portal</a></li>
            </ul>
          </div>
          <div>
            <h3 className="section-title mb-4">Tools</h3>
            <ul className="space-y-2">
              <li><a href="#" className="nav-link">What Links Here</a></li>
              <li><a href="#" className="nav-link">Special Pages</a></li>
              <li><a href="#" className="nav-link">Page Information</a></li>
            </ul>
          </div>
          <div>
            <h3 className="section-title mb-4">Print/Export</h3>
            <ul className="space-y-2">
              <li><a href="#" className="nav-link">Download as PDF</a></li>
              <li><a href="#" className="nav-link">Printable Version</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-wiki-border text-sm text-gray-500 dark:text-gray-400">
          <p>Text is available under the Creative Commons Attribution-ShareAlike License; additional terms may apply.</p>
          <p className="mt-2">© 2025 Perplexipedia. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}; 