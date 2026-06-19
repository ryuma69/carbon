import React, { useState, useEffect } from 'react';
import { api } from './services/api.client.js';
import type { CarbonLog, UserProfile, ExplainableRecommendation } from 'shared';

// Import subcomponents
import { OverviewCard } from './components/Dashboard/OverviewCard.js';
import { QuickLog } from './components/Dashboard/QuickLog.js';
import { EmissionChart } from './components/Dashboard/EmissionChart.js';
import { ChatWindow } from './components/Assistant/ChatWindow.js';
import { ReceiptScanner } from './components/Assistant/ReceiptScanner.js';
import { ActionChecklist } from './components/Actions/ActionChecklist.js';
import { ProgressTree } from './components/Actions/ProgressTree.js';

export default function App() {
  // Auth state
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [email, setEmail] = useState(localStorage.getItem('email') || '');
  const [isLoginView, setIsLoginView] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // Dashboard / App states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'actions' | 'assistant'>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // Data stores
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<CarbonLog[]>([]);
  const [summary, setSummary] = useState<any>({ averages: {}, breakdown: {}, forecast: {} });
  const [recommendations, setRecommendations] = useState<ExplainableRecommendation[]>([]);
  const [gridForecast, setGridForecast] = useState<any>(null);

  // loading state
  const [loading, setLoading] = useState(false);

  // Sync data from database
  const syncAppData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const p = await api.getProfile();
      setProfile(p);

      const l = await api.getLogs();
      setLogs(l);

      const s = await api.getDashboardSummary();
      setSummary(s);

      const r = await api.getRecommendations();
      setRecommendations(r);

      const g = await api.getGridForecast();
      setGridForecast(g);
    } catch (err) {
      console.error('Failed to sync app data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      syncAppData();
    }
  }, [token]);

  // Handle Theme Toggling
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Auth submissions
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      alert('Fields cannot be empty.');
      return;
    }

    try {
      if (isLoginView) {
        const res = await api.login(authEmail, authPassword);
        localStorage.setItem('token', res.token);
        localStorage.setItem('email', res.email);
        setToken(res.token);
        setEmail(res.email);
      } else {
        // Register with simple onboarding config defaults
        const onboardingPayload = {
          email: authEmail,
          password: authPassword,
          location: { zipCode: '94043', region: 'CA' },
          housing: { type: 'apartment', ownership: 'rent', heatingType: 'electric' },
          transport: { hasEV: false, hasGasCar: true, commuteDistanceMiles: 15, primaryMode: 'driving' },
          diet: 'omnivore',
          preferences: { focusArea: 'general' }
        };
        const res = await api.register(onboardingPayload);
        localStorage.setItem('token', res.token);
        localStorage.setItem('email', res.email);
        setToken(res.token);
        setEmail(res.email);
      }
      setAuthEmail('');
      setAuthPassword('');
    } catch (err: any) {
      alert(err.message || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    setToken(null);
    setEmail('');
    setProfile(null);
    setLogs([]);
  };

  // Handle carbon logging from widgets
  const handleEmissionsLogged = async (category: string, value: number, unit: string) => {
    try {
      await api.logEmissions(category, value, unit);
      await syncAppData(); // refresh calculations
      alert('Carbon log registered successfully!');
    } catch (err) {
      alert('Failed to register carbon log.');
    }
  };

  // Handle recommendation state completed/skipped
  const handleRecommendationAction = async (actionId: string, type: 'complete' | 'skip') => {
    try {
      await api.updateRecommendationState(actionId, type);
      await syncAppData();
    } catch (err) {
      alert('Failed to update recommendation status.');
    }
  };

  // Onboarding profile update ZIP Code
  const handleZipCodeUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const newZip = prompt('Enter your 5-digit ZIP code:', profile.location.zipCode);
    if (!newZip || !/^\d{5}$/.test(newZip)) {
      alert('Invalid ZIP code.');
      return;
    }

    try {
      await api.updateProfile({
        location: {
          zipCode: newZip,
          region: profile.location.region
        }
      });
      await syncAppData();
    } catch (err) {
      alert('Failed to update profile ZIP.');
    }
  };

  // Login view render
  if (!token) {
    return (
      <div 
        style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          backgroundColor: 'var(--bg-primary)',
          fontFamily: 'var(--font-sans)',
          padding: '20px'
        }}
      >
        <div className="glass-card" style={{ width: '100%', maxWidth: '400px' }}>
          <h1 style={{ textAlign: 'center', marginBottom: '4px' }} className="title-gradient">EcoLens</h1>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.95rem' }}>
            AI Carbon Intelligence System
          </p>

          {/* Accessibility dynamic announcement of form view switch */}
          <div className="sr-only" aria-live="polite">
            {isLoginView ? 'Switched to Sign In form' : 'Switched to Create Account registration form'}
          </div>

          <h2 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {isLoginView ? 'Sign In' : 'Register Account'}
          </h2>

          <form onSubmit={handleAuthSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label htmlFor="auth-email-input" style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Email Address</label>
                <input
                  id="auth-email-input"
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="form-input"
                  placeholder="name@domain.com"
                  autoFocus
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label htmlFor="auth-password-input" style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Password</label>
                <input
                  id="auth-password-input"
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="form-input"
                  placeholder="••••••••"
                  autoComplete={isLoginView ? 'current-password' : 'new-password'}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
                {isLoginView ? 'Login' : 'Create Account'}
              </button>

              <button
                type="button"
                onClick={() => setIsLoginView(!isLoginView)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-ring)',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  marginTop: '8px'
                }}
              >
                {isLoginView ? 'Need an account? Sign Up' : 'Already have an account? Login'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard interface render
  return (
    <div className="app-container">
      {/* WCAG Skip Link */}
      <a href="#main-content-anchor" className="skip-link">Skip to Content</a>

      {/* Sidebar Navigation */}
      <nav className="sidebar" aria-label="Main Navigation">
        <div>
          <h1 className="title-gradient" style={{ fontSize: '1.8rem', marginBottom: '4px' }}>EcoLens</h1>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>AI Footprint System</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className="btn-primary"
            style={{ 
              background: activeTab === 'dashboard' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'dashboard' ? 'white' : 'var(--text-primary)',
              textAlign: 'left',
              paddingLeft: '16px'
            }}
          >
            📊 Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('actions')} 
            className="btn-primary"
            style={{ 
              background: activeTab === 'actions' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'actions' ? 'white' : 'var(--text-primary)',
              textAlign: 'left',
              paddingLeft: '16px'
            }}
          >
            🌱 Action Center
          </button>
          <button 
            onClick={() => setActiveTab('assistant')} 
            className="btn-primary"
            style={{ 
              background: activeTab === 'assistant' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'assistant' ? 'white' : 'var(--text-primary)',
              textAlign: 'left',
              paddingLeft: '16px'
            }}
          >
            💬 AI Eco-Coach
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--card-border)', paddingTop: '16px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Logged in as: <br /><strong>{email}</strong>
          </div>
          <button onClick={toggleTheme} className="btn-primary" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}>
            {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
          <button onClick={handleLogout} className="btn-primary" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-error)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            🚪 Logout
          </button>
        </div>
      </nav>

      {/* Main Panel Content */}
      <main id="main-content-anchor" className="main-content" tabIndex={-1}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1>Greeting, Eco-Novice!</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Welcome back! You have logged {logs.length} carbon activities.</p>
          </div>
          {profile && (
            <button 
              onClick={handleZipCodeUpdate}
              className="btn-primary" 
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
            >
              📍 ZIP: {profile.location.zipCode}
            </button>
          )}
        </header>

        {loading && <div style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>Synchronizing carbon metrics...</div>}

        {/* Tab Controllers */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-grid">
            <div className="dashboard-left">
              <OverviewCard averages={summary.averages} forecast={summary.forecast} />
              <EmissionChart averages={summary.averages} />
            </div>
            
            <div className="dashboard-right">
              <QuickLog onLogSubmitted={handleEmissionsLogged} />

              {/* Grid Optimizer Widget */}
              {gridForecast && (
                <div className="glass-card">
                  <h2>Electrical Grid Optimizer</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                    Scheduling home appliance energy slots
                  </p>
                  
                  <div style={{ fontSize: '0.95rem', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '12px 16px' }}>
                    Optimal Hour: <strong>{gridForecast.recommendation.targetHour}:00</strong> <br />
                    Saving Potential: <span style={{ color: 'var(--accent-success)', fontWeight: 600 }}>-{gridForecast.recommendation.emissionsReductionEstimateKg} kg CO₂e</span> per load.
                  </div>
                  
                  <div className="grid-intensity-meter">
                    <div 
                      className="grid-intensity-bar" 
                      style={{ 
                        width: '100%', 
                        background: 'linear-gradient(90deg, #34d399 0%, #fbbf24 50%, #ef4444 100%)' 
                      }} 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="dashboard-grid">
            <div className="dashboard-left">
              <ActionChecklist 
                recommendations={recommendations} 
                onActionTriggered={handleRecommendationAction} 
              />
            </div>
            <div className="dashboard-right">
              <ProgressTree completedCount={profile?.behavior.completedActions.length || 0} />
            </div>
          </div>
        )}

        {activeTab === 'assistant' && (
          <div className="dashboard-grid" style={{ gridTemplateColumns: '5fr 3fr' }}>
            <div className="dashboard-left">
              <ChatWindow onLogCompleted={syncAppData} />
            </div>
            <div className="dashboard-right">
              <ReceiptScanner onScanCompleted={syncAppData} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
