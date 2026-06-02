'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import Navbar from '@/components/Navbar';
import RewardsSection from '@/components/RewardsSection';
import FAQ from '@/components/FAQ';
import Leaderboard from '@/components/Leaderboard';
import CoinWallet from '@/components/CoinWallet';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const STORAGE_KEY = 'prism_auth_v2';

export default function Home() {
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [kickId, setKickId] = useState('');
  const [user, setUser] = useState(null);
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authStep, setAuthStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState('');
  const [streamInfo, setStreamInfo] = useState({
    isLive: false,
    followers: 0,
    category: 'Offline',
    loading: true
  });
  const [activities, setActivities] = useState([]);
  const [raffles, setRaffles] = useState([]);
  const [giveaways, setGiveaways] = useState([]);

  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEY);
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setCoins(parsedUser.coins || 0);
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    fetchStreamInfo();
    fetchActivities();
    fetchRafflesAndGiveaways();
    const streamInterval = setInterval(fetchStreamInfo, 300000);
    const activityInterval = setInterval(fetchActivities, 30000);
    return () => {
      clearInterval(streamInterval);
      clearInterval(activityInterval);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const justLoggedOut = sessionStorage.getItem('just_logged_out');

    if (params.get('login_success') === 'true' && !justLoggedOut) {
      const userData = {
        username: params.get('username'),
        avatar: decodeURIComponent(params.get('avatar') || ''),
        coins: parseInt(params.get('coins') || '100', 10)
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      sessionStorage.removeItem('just_logged_out');
      window.location.href = window.location.pathname;
    } else if (params.get('error')) {
      setError(`Login failed: ${params.get('error')}`);
      setShowLoginModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await fetch(`${API}/activity`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.success) {
        setActivities(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch activity:", err);
    }
  };

  const fetchStreamInfo = async () => {
    try {
      const response = await fetch(`${API}/kick/stream-info/miarush`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.success) {
        setStreamInfo({
          isLive: result.isLive,
          followers: result.followers,
          category: result.category,
          loading: false
        });
      }
    } catch (err) {
      setStreamInfo(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchRafflesAndGiveaways = async () => {
    try {
      const rRes = await fetch(`${API}/raffles`);
      const rData = await rRes.json();
      if (rData.success) setRaffles(rData.data);

      const gRes = await fetch(`${API}/giveaways`);
      const gData = await gRes.json();
      if (gData.success) setGiveaways(gData.data);
    } catch (e) {}
  };

  const startLogin = () => {
    sessionStorage.removeItem('just_logged_out');
    window.location.href = `${API}/auth/kick?return_to=${encodeURIComponent(window.location.pathname)}`;
  };

  const handleEntry = async (e, id, type) => {
    e.preventDefault();
    if (!user) {
      toast.error('Log in first to enter raffles or giveaways!', {
        position: "top-center",
        autoClose: 3000
      });
      return;
    }

    try {
      const endpoint = type === 'raffle' ? 'raffles' : 'giveaways';
      const res = await fetch(`${API}/${endpoint}/${id}/enter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchRafflesAndGiveaways(); // Refresh data
      } else {
        toast.warning(data.message);
      }
    } catch (err) {
      toast.error('Failed to register. Please try again.');
    }
  };

  const confirmLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API}/auth/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: kickId })
      });
      const result = await response.json();
      if (result.success) {
        const userData = {
          username: result.user.username,
          avatar: result.user.avatar,
          coins: result.user.coins || 100
        };
        setUser(userData);
        setCoins(userData.coins);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
        setShowLoginModal(false);
        resetAuth();
      } else {
        setError(result.message || 'Verification failed');
      }
    } catch (err) {
      setError('Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetAuth = () => {
    setAuthStep(1);
    setKickId('');
    setVerificationCode('');
    setError('');
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    sessionStorage.setItem('just_logged_out', 'true');
    setUser(null);
    setCoins(0);
    setShowLoginModal(false);
    resetAuth();
    window.location.replace('/');
  };

  const handleCoinsUpdate = (newCoins) => {
    if (!user) return;
    setCoins(newCoins);
    const updatedUser = { ...user, coins: newCoins };
    setUser(updatedUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
  };

  return (
    <main>
      <Navbar 
        key={user ? `logged-in-${user.username}` : 'logged-out'}
        user={user} 
        onLogout={handleLogout} 
        onLoginClick={startLogin}
        coins={coins}
      />

      <section id="home" className="hero">
        <video autoPlay muted loop id="hero-video">
          <source src="/BG.mp4" type="video/mp4" />
        </video>
        <div className="hero-content">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            WELCOME TO <br /> <span className="highlight-blue">MIARUSH BONUSES</span>
          </motion.h1>
          <p className="hero-description">
            Discover premium casinos with unbeatable welcome rewards and guaranteed instant withdrawals.
          </p>
          <div className="hero-stats">
            <div className="stat-pill">
              <i className="fas fa-check-circle"></i> 100% VERIFIED
            </div>
            <div className="stat-pill">
              <i className="fas fa-bolt"></i> FAST PAYOUTS
            </div>
            <div className="stat-pill">
              <i className="fas fa-users"></i> 10K+ PLAYERS
            </div>
          </div>
        </div>
      </section>

      <section id="stream" className="stream-section section-padding">
        <div className="container">
          <div className="stream-layout">
            <div className="stream-main">
              <div className="stream-container">
                {streamInfo.isLive && <div className="live-badge-pulsing">LIVE</div>}
                <iframe 
                  src="https://player.kick.com/miarush" 
                  width="100%" 
                  height="100%" 
                  frameBorder="0" 
                  scrolling="no" 
                  allowFullScreen
                ></iframe>
              </div>
            </div>
            <div className="stream-sidebar">
              <div className="streamer-card">
                <div className="streamer-header">
                  <img src="/mia.png" alt="MIARUSH" className="streamer-avatar" />
                  <div className="streamer-info">
                    <h3>MIARUSH</h3>
                    <span className={`status-badge ${streamInfo.isLive ? 'online' : 'offline'}`}>
                      {streamInfo.isLive ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                </div>
                <div className="stream-actions">
                  <a href="https://kick.com/miarush" target="_blank" rel="noopener noreferrer" className="stream-btn primary">
                    <i className="fab fa-kickstarter"></i> WATCH ON KICK
                  </a>
                </div>
                <div className="stream-stats">
                  <div className="stat-item">
                    <span className="stat-value">{streamInfo.loading ? '...' : (streamInfo.followers || 0).toLocaleString()}</span>
                    <span className="stat-label">Followers</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{streamInfo.loading ? '...' : streamInfo.category.toUpperCase()}</span>
                    <span className="stat-label">Category</span>
                  </div>
                </div>
              </div>
              <div className="activity-card">
                <h4>LATEST ACTIVITY</h4>
                <div className="activity-list">
                  {activities.length > 0 ? activities.map((activity) => (
                    <div className="activity-item" key={activity.id}>
                      <div className="activity-icon">
                        {activity.action.includes('login') ? '👤' : 
                         activity.action.includes('win') ? '🏆' : 
                         activity.action.includes('wager') ? '💰' : '🎁'}
                      </div>
                      <div className="activity-text">
                        <p><span className="activity-user">{activity.user}</span> {activity.action}</p>
                        <span>{activity.time}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="activity-item">
                      <p className="loading-text">Loading activity...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="raffles" className="raffles-section">
        <div className="container" id="giveaways">
          <h2 className="section-title">DAILY <span className="highlight-blue">RAFFLES & GIVEAWAYS</span></h2>
          <div className="raffle-grid">
            {raffles.length > 0 ? raffles.slice(0, 3).map(raffle => (
              <div className="flip-card" key={raffle._id}>
                <div className="flip-card-inner">
                  <div className="flip-card-front">
                    <div className={`raffle-badge ${raffle.status === 'active' ? 'pulse-badge' : 'upcoming'}`}>
                      {raffle.status.toUpperCase()}
                    </div>
                    <div className="raffle-icon-large">🎟️</div>
                    <h3 className="raffle-title-large">{raffle.title}</h3>
                    <div className="raffle-prize-large">{raffle.prize}</div>
                    <p className="raffle-hint">Hover to Register</p>
                  </div>
                  <div className="flip-card-back">
                    <h3>REQUIREMENTS</h3>
                    <p className="raffle-req-text">{raffle.requirement || 'No specific requirements. Open for all players.'}</p>
                    <div className="raffle-meta">
                      <span><i className="fas fa-users"></i> {raffle.entries}/{raffle.maxEntries}</span>
                    </div>
                    <button 
                      className="register-btn" 
                      onClick={(e) => handleEntry(e, raffle._id, 'raffle')}
                    >
                      REGISTER NOW
                    </button>
                  </div>
                </div>
              </div>
            )) : giveaways.length > 0 ? giveaways.slice(0, 3).map(giveaway => (
              <div className="flip-card" key={giveaway._id}>
                <div className="flip-card-inner">
                  <div className="flip-card-front">
                    <div className={`raffle-badge ${giveaway.status === 'active' ? 'pulse-badge' : 'upcoming'}`}>
                      {giveaway.status.toUpperCase()}
                    </div>
                    <div className="raffle-icon-large">🎁</div>
                    <h3 className="raffle-title-large">{giveaway.title}</h3>
                    <div className="raffle-prize-large">{giveaway.prize}</div>
                    <p className="raffle-hint">Hover to Claim</p>
                  </div>
                  <div className="flip-card-back">
                    <h3>GIVEAWAY INFO</h3>
                    <p className="raffle-req-text">{giveaway.description || 'Exclusive community giveaway for active members.'}</p>
                    <div className="giveaway-code-display">
                      <code>{giveaway.code || 'NO CODE REQ'}</code>
                    </div>
                    <button 
                      className="register-btn" 
                      onClick={(e) => handleEntry(e, giveaway._id, 'giveaway')}
                    >
                      CLAIM NOW
                    </button>
                  </div>
                </div>
              </div>
            ) ) : (
              <div className="flip-card">
                <div className="flip-card-inner">
                  <div className="flip-card-front">
                    <div className="raffle-badge pulse-badge">DAILY</div>
                    <div className="raffle-icon-large">⚡</div>
                    <h3 className="raffle-title-large">STAY TUNED</h3>
                    <div className="raffle-prize-large">NEW DROPS SOON</div>
                  </div>
                  <div className="flip-card-back">
                    <h3>COMING SOON</h3>
                    <p>We are preparing new exclusive rewards for you.</p>
                    <button className="register-btn">NOTIFY ME</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bonuses-preview-section">
        <div className="container">
          <div className="section-header-centered">
            <h2 className="section-title">EXCLUSIVE <span className="highlight-blue">BONUSES</span></h2>
            <p className="section-subtitle">Premium deals hand-picked for the MIARUSH community.</p>
          </div>
          
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

          <div className="view-all-container" style={{ marginTop: '80px' }}>
            <Link href="/bonuses" className="view-all-games-btn">
              <span>VIEW ALL BONUSES</span>
              <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
        </div>
      </section>

      <section id="games-preview" className="games-preview-section">
        <div className="container">
          <div className="section-header-centered">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="section-title"
            >
              MIARUSH <span className="highlight-blue">ORIGINALS</span>
            </motion.h2>
            <p className="section-subtitle">Experience the next generation of provably fair gaming.</p>
            <div className="preview-wallet-wrapper">
              <CoinWallet user={user} onCoinsUpdate={handleCoinsUpdate} />
            </div>
          </div>
          
          <div className="preview-grid">
            <motion.div 
              whileHover={{ y: -10 }}
              className="preview-card dice" 
              onClick={() => window.location.href = '/games/dice'}
            >
              <div className="preview-card-inner">
                <div className="preview-emoji">🎲</div>
                <h3>DICE</h3>
                <p>Predict over or under</p>
                <div className="preview-play-now">PLAY NOW</div>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -10 }}
              className="preview-card mines" 
              onClick={() => window.location.href = '/games/mines'}
            >
              <div className="preview-card-inner">
                <div className="preview-emoji">💣</div>
                <h3>MINES</h3>
                <p>Avoid hidden mines</p>
                <div className="preview-play-now">PLAY NOW</div>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -10 }}
              className="preview-card limbo" 
              onClick={() => window.location.href = '/games/limbo'}
            >
              <div className="preview-card-inner">
                <div className="preview-emoji">🚀</div>
                <h3>LIMBO</h3>
                <p>Infinite multipliers</p>
                <div className="preview-play-now">PLAY NOW</div>
              </div>
            </motion.div>
          </div>

          <div className="view-all-container">
            <Link href="/games" className="view-all-games-btn">
              <span>EXPLORE ALL GAMES</span>
              <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
        </div>
      </section>

      <section className="homepage-leaderboard-preview section-padding">
        <div className="container">
          <div className="section-header-centered">
            <h2 className="section-title">GLOBAL <span className="highlight-blue">RANKINGS</span></h2>
            <p className="section-subtitle">Top players competing for glory.</p>
          </div>
          <Leaderboard />
          <div className="view-all-container mt-10">
            <Link href="/rankings" className="view-all-games-btn">
              <span>VIEW FULL RANKINGS</span>
              <i className="fas fa-arrow-right"></i>
            </Link>
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
            onClick={() => { setShowLoginModal(false); resetAuth(); }}
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
              <h3>{authStep === 1 ? 'LOGIN WITH KICK' : 'VERIFY OWNERSHIP'}</h3>
              <p>
                {authStep === 1 
                  ? 'Enter your Kick username to track your rewards and rank.' 
                  : `Please add the code below to your Kick bio to verify you own this account.`}
              </p>
              
              {error && <div className="modal-error">{error}</div>}
              
              {authStep === 1 ? (
                <div className="login-form">
                  <p className="modal-info-text">
                    You will be redirected to Kick to safely authorize your account.
                  </p>
                  <button onClick={startLogin} className="login-submit-btn" disabled={loading}>
                    {loading ? 'REDIRECTING...' : 'LOGIN WITH KICK'}
                  </button>
                </div>
              ) : (
                <div className="verification-step">
                  <div className="code-display">
                    <code>{verificationCode}</code>
                    <button className="copy-btn" onClick={() => navigator.clipboard.writeText(verificationCode)}>
                      <i className="fas fa-copy"></i>
                    </button>
                  </div>
                  
                  <div className="verification-actions">
                    <button 
                      className="login-submit-btn" 
                      onClick={() => confirmLogin()}
                      disabled={loading}
                    >
                      {loading ? 'VERIFYING...' : 'I HAVE UPDATED MY BIO'}
                    </button>
                  </div>
                  
                  <button className="back-link" onClick={() => setAuthStep(1)}>BACK</button>
                </div>
              )}
              
              <button 
                className="modal-close-link" 
                onClick={() => { setShowLoginModal(false); resetAuth(); }} 
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
