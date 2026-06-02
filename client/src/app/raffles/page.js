'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import Navbar from '@/components/Navbar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function RafflesPage() {
  const [user, setUser] = useState(null);
  const [coins, setCoins] = useState(0);
  const [raffles, setRaffles] = useState([]);
  const [loading, setLoading] = useState(true);

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
    }

    const fetchRaffles = async () => {
      try {
        const res = await fetch(`${API}/raffles`);
        const data = await res.json();
        if (data.success) setRaffles(data.data);
      } catch (e) {} finally {
        setLoading(false);
      }
    };
    fetchRaffles();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('prism_auth_v2');
    sessionStorage.setItem('just_logged_out', 'true');
    setUser(null);
    setCoins(0);
    window.location.replace(window.location.pathname);
  };

  const handleEntry = async (id) => {
    if (!user) {
      toast.error('Log in first to enter!', { position: 'top-center' });
      return;
    }

    try {
      const res = await fetch(`${API}/raffles/${id}/enter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        // Refresh data
        const refreshRes = await fetch(`${API}/raffles`);
        const refreshData = await refreshRes.json();
        if (refreshData.success) setRaffles(refreshData.data);
      } else {
        toast.warning(data.message);
      }
    } catch (err) {
      toast.error('Failed to register. Please try again.');
    }
  };

  const startLogin = () => {
    sessionStorage.removeItem('just_logged_out');
    window.location.href = `${API}/auth/kick?return_to=${encodeURIComponent(window.location.pathname)}`;
  };

  return (
    <main className="min-h-screen bg-dark">
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        onLoginClick={startLogin}
        coins={coins}
      />
      
      <section className="section-padding pt-32">
        <div className="container">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="section-title">DAILY <span className="highlight-blue">RAFFLES & GIVEAWAYS</span></h1>
            <p className="page-subtitle">Participate in exclusive daily events and win massive crypto prizes.</p>
          </motion.div>

          <div className="raffle-grid">
            {loading ? (
              <div className="text-center py-20 w-full opacity-50">LOADING RAFFLES...</div>
            ) : raffles.length > 0 ? (
              raffles.map((raffle) => (
                <motion.div key={raffle._id} whileHover={{ y: -5 }} className={`raffle-card ${raffle.status === 'active' ? 'active-raffle' : ''}`}>
                  <div className={`raffle-badge ${raffle.status === 'active' ? 'pulse-badge' : raffle.status === 'upcoming' ? 'upcoming' : ''}`}>
                    {raffle.status === 'active' ? 'LIVE NOW' : raffle.status.toUpperCase()}
                  </div>
                  <div className="raffle-prize">{raffle.prize} {raffle.title}</div>
                  <p>{raffle.requirement || 'No specific requirements.'}</p>
                  <div className="raffle-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{width: `${Math.min((raffle.entries / raffle.maxEntries) * 100, 100)}%`}}
                      ></div>
                    </div>
                    <div className="progress-labels">
                      <span>{raffle.entries}/{raffle.maxEntries} ENTRIES</span>
                      <span>{raffle.status === 'active' ? 'ENDS SOON' : 'UPCOMING'}</span>
                    </div>
                  </div>
                  <button 
                    className={`raffle-btn ${raffle.status === 'active' ? '' : 'outline'}`}
                    onClick={() => handleEntry(raffle._id)}
                  >
                    {raffle.status === 'active' ? 'ENTER RAFFLE' : 'VIEW DETAILS'}
                  </button>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-20 w-full opacity-50">NO RAFFLES AVAILABLE AT THE MOMENT.</div>
            )}
          </div>
        </div>
      </section>
      
      <footer>
        <div className="container">
          <p>&copy; 2024 MIARUSH. ALL RIGHTS RESERVED.</p>
        </div>
      </footer>
    </main>
  );
}
