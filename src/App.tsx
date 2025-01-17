import { useState, useEffect } from 'react'
import './App.css'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Footer } from './components/Footer'
import { AuthProvider } from './contexts/AuthContext'
import { Login } from './components/auth/Login'
import { Signup } from './components/auth/Signup'
import { Dashboard } from './components/dashboard/Dashboard'

type View = 'main' | 'login' | 'signup' | 'dashboard';

function AppContent() {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [fontSize, setFontSize] = useState('standard');
  const [colorMode, setColorMode] = useState('light');
  const [currentView, setCurrentView] = useState<View>('main');

  // Update data-theme attribute when color mode changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', colorMode);
    if (colorMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [colorMode]);

  const renderContent = () => {
    switch (currentView) {
      case 'login':
        return <Login onSignupClick={() => setCurrentView('signup')} />;
      case 'signup':
        return <Signup onLoginClick={() => setCurrentView('login')} />;
      case 'dashboard':
        return <Dashboard />;
      default:
        return (
          <div className="container mx-auto px-4 py-8 flex flex-1">
            <Sidebar
              isMenuOpen={isMenuOpen}
              fontSize={fontSize}
              setFontSize={setFontSize}
              colorMode={colorMode}
              setColorMode={setColorMode}
            />

            <main className={`flex-1 transition-all duration-300 ease-in-out ${!isMenuOpen ? 'md:pl-0' : ''}`}>
              <div className="wiki-card">
                <h1 className="text-4xl font-linux-libertine mb-4 section-title">Welcome to Perplexipedia</h1>
                <p className="text-lg mb-6 section-text">
                  The free AI-powered encyclopedia that anyone can edit.
                </p>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="wiki-card">
                    <h2 className="text-2xl font-linux-libertine mb-4 section-title">Featured Article</h2>
                    <p className="section-text">Discover our featured article of the day...</p>
                  </div>
                  <div className="wiki-card">
                    <h2 className="text-2xl font-linux-libertine mb-4 section-title">Did You Know?</h2>
                    <p className="section-text">Interesting facts from our latest articles...</p>
                  </div>
                </div>
              </div>
            </main>
          </div>
        );
    }
  };

  return (
    <div className={`min-h-screen bg-wiki-bg flex flex-col ${
      fontSize === 'small' ? 'text-sm' : fontSize === 'large' ? 'text-lg' : 'text-base'
    }`}>
      <Header 
        isMenuOpen={isMenuOpen} 
        setIsMenuOpen={setIsMenuOpen}
        onLoginClick={() => setCurrentView('login')}
        onSignupClick={() => setCurrentView('signup')}
        onDashboardClick={() => setCurrentView('dashboard')}
      />

      <div className="flex-1 flex flex-col">
        {renderContent()}
      </div>

      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
