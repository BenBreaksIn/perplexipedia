import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../hooks/useAdmin';
import { useAppearance } from '../../contexts/AppearanceContext';
import { Sidebar } from '../Sidebar';

export const DashboardAdmin: React.FC = () => {
  const { isAdmin, loading } = useAdmin();
  useAppearance();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container !max-w-[1672px] mx-auto px-4 py-8 flex flex-1">
      <Sidebar />

      <main className="flex-1 transition-all duration-300 ease-in-out">
        <div className="perplexipedia-card">
          <h1 className="text-4xl font-linux-libertine mb-4 section-title">Admin Dashboard</h1>
          <p className="text-lg mb-6 section-text">
            Manage users, content, and system settings.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="perplexipedia-card">
              <h2 className="text-2xl font-linux-libertine mb-4 section-title">User Management</h2>
              <p className="section-text">Manage user roles and permissions, review user activity, and handle user reports.</p>
            </div>
            
            <div className="perplexipedia-card">
              <h2 className="text-2xl font-linux-libertine mb-4 section-title">Content Moderation</h2>
              <p className="section-text">Review and moderate articles, manage content flags, and oversee editorial guidelines.</p>
            </div>
            
            <div className="perplexipedia-card">
              <h2 className="text-2xl font-linux-libertine mb-4 section-title">System Settings</h2>
              <p className="section-text">Configure system-wide settings, manage API integrations, and monitor performance.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}; 