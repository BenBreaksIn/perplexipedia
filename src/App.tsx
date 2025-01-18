import './App.css'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Footer } from './components/Footer'
import { AuthProvider } from './contexts/AuthContext'
import { AppearanceProvider, useAppearance } from './contexts/AppearanceContext'
import { Login } from './components/auth/Login'
import { Signup } from './components/auth/Signup'
import { Dashboard } from './components/dashboard/Dashboard'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

function AppContent() {
  const { fontSize } = useAppearance();

  return (
    <div className={`min-h-screen bg-perplexipedia-bg flex flex-col ${
      fontSize === 'small' ? 'text-sm' : fontSize === 'large' ? 'text-lg' : 'text-base'
    }`}>
      <Header />

      <div className="flex-1 flex flex-col">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard/*" element={<Dashboard />} />
          <Route path="/" element={
            <div className="container !max-w-[1672px] mx-auto px-4 py-8 flex flex-1">
              <Sidebar />

              <main className="flex-1 transition-all duration-300 ease-in-out">
                <div className="perplexipedia-card">
                  <h1 className="text-4xl font-linux-libertine mb-4 section-title">Welcome to Perplexipedia</h1>
                  <p className="text-lg mb-6 section-text">
                    The free AI-powered encyclopedia that anyone can edit.
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="perplexipedia-card">
                      <h2 className="text-2xl font-linux-libertine mb-4 section-title">Featured Article</h2>
                      <p className="section-text">Discover our featured article of the day...</p>
                    </div>
                    <div className="perplexipedia-card">
                      <h2 className="text-2xl font-linux-libertine mb-4 section-title">Did You Know?</h2>
                      <p className="section-text">Interesting facts from our latest articles...</p>
                    </div>
                  </div>
                </div>
              </main>
            </div>
          } />
        </Routes>
      </div>

      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppearanceProvider>
          <AppContent />
        </AppearanceProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
