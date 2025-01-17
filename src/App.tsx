import { useState, useEffect } from 'react'
import './App.css'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Footer } from './components/Footer'

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [fontSize, setFontSize] = useState('standard');
  const [colorMode, setColorMode] = useState('light');

  // Update data-theme attribute when color mode changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', colorMode);
    if (colorMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [colorMode]);

  return (
    <div className={`min-h-screen bg-wiki-bg ${fontSize === 'small' ? 'text-sm' : fontSize === 'large' ? 'text-lg' : 'text-base'}`}>
      <Header isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 flex">
        <Sidebar
          isMenuOpen={isMenuOpen}
          fontSize={fontSize}
          setFontSize={setFontSize}
          colorMode={colorMode}
          setColorMode={setColorMode}
        />

        {/* Main Content Area */}
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

      <Footer />
    </div>
  );
}

export default App;
