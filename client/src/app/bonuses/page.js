'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function BonusesPage() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [user, setUser] = useState(null);
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('prism_auth_v2');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setCoins(parsed.coins || 0);
      } catch (e) {}
    }

    const params = new URLSearchParams(window.location.search);
    const justLoggedOut = sessionStorage.getItem('just_logged_out');

    if (params.get('login_success') === 'true' && !justLoggedOut) {
      const userData = {
        username: params.get('username'),
        avatar: decodeURIComponent(params.get('avatar') || ''),
        coins: parseInt(params.get('coins') || '100', 10)
      };
      setUser(userData);
      setCoins(userData.coins);
      localStorage.setItem('prism_auth_v2', JSON.stringify(userData));
      sessionStorage.removeItem('just_logged_out');
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.href = window.location.pathname;
    } else if (params.get('error')) {
      setError(`Login failed: ${params.get('error')}`);
      setShowLoginModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('prism_auth_v2');
    localStorage.removeItem('prism_user');
    sessionStorage.setItem('just_logged_out', 'true');
    setUser(null);
    setCoins(0);
    window.location.replace(window.location.pathname);
  };

  const startLogin = () => {
    sessionStorage.removeItem('just_logged_out');
    window.location.href = `${API}/auth/kick?return_to=${encodeURIComponent(window.location.pathname)}`;
  };

  return (
    <main className="bonuses-page-container">
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        onLoginClick={startLogin}
        coins={coins}
      />

      <section className="bonuses-hero">
        <div className="container">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="section-title"
          >
            EXCLUSIVE <span className="highlight-blue">CASINO BONUSES</span>
          </motion.h1>
          <p className="page-subtitle">Hand-picked premium deals for the MIARUSH community.</p>
        </div>
      </section>

      <section className="bonus-section section-padding">
        <div className="container">
          <div className="rainbet-highlight-card">
            <div className="rainbet-content">
              <div className="rainbet-badge pulse-badge">🔥 HOTTEST DEAL</div>
              <h3 className="rainbet-title">MEGA DICE</h3>
              <p className="rainbet-desc">High-stakes crypto casino with instant withdrawals and elite rewards. Experience the most trusted platform in the industry.</p>
              <div className="rainbet-features">
                <span><i className="fas fa-bolt"></i> Instant Payout</span>
                <span><i className="fas fa-crown"></i> VIP Rewards</span>
                <span><i className="fas fa-coins"></i> High RTP</span>
              </div>
              <a href="https://casii.no/MiaRush" target="_blank" rel="noopener noreferrer" className="rainbet-btn">
                CLAIM EXCLUSIVE BONUS <i className="fas fa-arrow-right"></i>
              </a>
            </div>
            <div className="rainbet-visual">
              <div className="rainbet-logo">MEGA DICE</div>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="container">
          <p>&copy; 2024 MIARUSH. ALL RIGHTS RESERVED.</p>
        </div>
      </footer>

      <AnimatePresence>
        {showLoginModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay" 
            onClick={() => setShowLoginModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="modal-content" 
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-kick-icon">
                <i className="fab fa-kickstarter" style={{ color: '#53fc18', fontSize: '50px' }}></i>
              </div>
              <h3>LOGIN WITH KICK</h3>
              <p>Enter your Kick username to track your rewards and rank.</p>
              
              {error && <div className="modal-error">{error}</div>}
              
              <div className="login-form">
                <p className="modal-info-text">
                  You will be redirected to Kick to safely authorize your account.
                </p>
                <button onClick={startLogin} className="login-submit-btn" disabled={loading}>
                  {loading ? 'REDIRECTING...' : 'LOGIN WITH KICK'}
                </button>
              </div>
              
              <button 
                className="modal-close-link" 
                onClick={() => { setShowLoginModal(false); setError(''); }} 
                disabled={loading}
              >
                CANCEL
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function BonusCard({ name, badge, link, desc, features, isFeatured }) {
  return (
    <div className={`bonus-card ${isFeatured ? 'featured' : ''}`}>
      <div className="bonus-badge">{badge}</div>
      <h3 className="bonus-name">{name}</h3>
      <p className="bonus-desc">{desc}</p>
      <div className="bonus-features">
        {features.map((f, i) => (
          <span key={i} className="feature-tag">{f}</span>
        ))}
      </div>
      <a href={link} target="_blank" rel="noopener noreferrer" className="bonus-button">
        CLAIM NOW <i className="fas fa-arrow-right"></i>
      </a>
    </div>
  );
}
