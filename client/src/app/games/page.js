'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const GAMES = [
  { id: 'dice',         name: 'DICE',         emoji: '🎲', desc: 'Predict over/under numbers', color: '#00f2ff', tag: 'CLASSIC',   image: 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?auto=format&fit=crop&q=80&w=800' },
  { id: 'limbo',        name: 'LIMBO',        emoji: '🚀', desc: 'Set targets, watch it launch', color: '#a855f7', tag: 'HIGH RISK', image: 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&q=80&w=800' },
  { id: 'mines',        name: 'MINES',        emoji: '💣', desc: 'Grid-based diamond hunt',     color: '#f59e0b', tag: 'STRATEGY',  image: 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&q=80&w=800' },
  { id: 'dragon_tower', name: 'DRAGON TOWER', emoji: '🐉', desc: 'Climb for massive rewards',    color: '#ef4444', tag: 'ADVENTURE', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=800' },
  { id: 'chicken',      name: 'CHICKEN',      emoji: '🌟', desc: 'Find the rockstar chicken',   color: '#53fc18', tag: 'LUCKY',     image: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=800' },
  { id: 'keno',         name: 'KENO',         emoji: '🎱', desc: 'Pick numbers, win big multipliers', color: '#e91e63', tag: 'LOTTERY',   image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&q=80&w=800' },
];

export default function GamesHubPage() {
  const [user, setUser]   = useState(null);
  const [coins, setCoins] = useState(0);

  const fetchBalance = async (username) => {
    try {
      const res = await fetch(`${API}/coins/balance/${username}`);
      const data = await res.json();
      if (data.success) {
        setCoins(data.coins);
        const saved = localStorage.getItem('prism_auth_v2');
        if (saved) {
          const p = JSON.parse(saved);
          p.coins = data.coins;
          localStorage.setItem('prism_auth_v2', JSON.stringify(p));
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    const saved = localStorage.getItem('prism_auth_v2');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setUser(p);
        setCoins(p.coins || 0);
        fetchBalance(p.username);
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
  }, []);

  const handleLogout = () => {
    localStorage.clear(); sessionStorage.clear();
    document.cookie.split(';').forEach(c => { document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/'); });
    window.location.replace('/games');
  };

  const startLogin = () => {
    window.location.href = `${API}/auth/kick?return_to=${encodeURIComponent('/games')}`;
  };

  return (
    <main className="hub-page">
      <Navbar user={user} onLogout={handleLogout} onLoginClick={startLogin} coins={coins} />

      <div className="hub-content-wrap">
        <header className="hub-header-v3">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="hub-title-container">
            <span className="hub-badge">ORIGINALS</span>
            <h1>MIARUSH <span className="blue-glow">GAMES</span></h1>
            <p>Experience our premium suite of provably fair arcade games.</p>
          </motion.div>
        </header>

        <div className="hub-cards-container">
          <div className="hub-cards-grid-v3">
            {GAMES.map((game, i) => (
              <motion.div 
                key={game.id} 
                className="hub-card-v3-wrapper"
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.08 }}
              >
                <Link href={`/games/${game.id}`} className="hub-card-v3" style={{ '--gc': game.color }}>
                  <div className="hub-card-v3-top">
                    <div className="hub-card-v3-img" style={{ backgroundImage: `url(${game.image})` }} />
                    <div className="hub-card-v3-overlay" />
                    <div className="hub-card-v3-tag">{game.tag}</div>
                    <div className="hub-card-v3-emoji">{game.emoji}</div>
                  </div>
                  <div className="hub-card-v3-body">
                    <h3>{game.name}</h3>
                    <p>{game.desc}</p>
                    <div className="hub-card-v3-footer">
                      <div className="hub-btn-pill">PLAY NOW</div>
                      <div className="hub-fair-info">🛡️ PROVABLY FAIR</div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .hub-page { min-height: 100vh; background: #080a0f; color: #fff; }
        .hub-content-wrap { padding-top: 100px; padding-bottom: 120px; }

        .hub-header-v3 { padding: 80px 0 60px; text-align: center; background: radial-gradient(circle at 50% 0%, rgba(0, 242, 255, 0.08) 0%, transparent 60%); }
        .hub-badge { display: inline-block; padding: 6px 16px; background: rgba(0, 242, 255, 0.1); color: #00f2ff; border-radius: 30px; font-weight: 900; font-size: 0.7rem; letter-spacing: 2px; margin-bottom: 20px; border: 1px solid rgba(0, 242, 255, 0.2); }
        .hub-header-v3 h1 { font-size: 4rem; font-weight: 900; letter-spacing: -2px; margin-bottom: 20px; }
        .blue-glow { color: #00f2ff; text-shadow: 0 0 40px rgba(0, 242, 255, 0.4); }
        .hub-header-v3 p { color: rgba(255,255,255,0.4); font-size: 1.2rem; max-width: 600px; margin: 0 auto; line-height: 1.6; }

        .hub-cards-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
        .hub-cards-grid-v3 { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 32px; }

        .hub-card-v3 {
          display: flex;
          flex-direction: column;
          background: #11141b;
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,0.08);
          overflow: hidden;
          text-decoration: none !important;
          transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
          height: 100%;
          position: relative;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }

        .hub-card-v3-top { height: 200px; position: relative; overflow: hidden; background: #080a0f; }
        .hub-card-v3-img { position: absolute; inset: 0; background-size: cover; background-position: center; transition: 0.8s; opacity: 0.15; filter: grayscale(100%) blur(4px); }
        .hub-card-v3-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 0%, #11141b 100%); }
        .hub-card-v3-tag { position: absolute; top: 20px; left: 24px; background: rgba(0,0,0,0.4); padding: 5px 12px; border-radius: 10px; font-size: 0.6rem; font-weight: 900; letter-spacing: 1.5px; color: var(--gc); border: 1px solid color-mix(in srgb, var(--gc) 40%, transparent); backdrop-filter: blur(8px); }
        .hub-card-v3-emoji { position: absolute; bottom: 10px; right: 24px; font-size: 5rem; transition: 0.5s; filter: drop-shadow(0 0 20px color-mix(in srgb, var(--gc) 20%, transparent)); }

        .hub-card-v3-body { padding: 32px; flex: 1; display: flex; flex-direction: column; }
        .hub-card-v3-body h3 { font-size: 2rem; font-weight: 900; color: #fff; margin-bottom: 12px; text-decoration: none !important; border: none !important; }
        .hub-card-v3-body p { color: rgba(255,255,255,0.5); font-size: 1rem; line-height: 1.6; margin-bottom: 28px; }

        .hub-card-v3-footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
        .hub-btn-pill { background: var(--gc); color: #000; padding: 12px 28px; border-radius: 14px; font-weight: 900; font-size: 0.9rem; letter-spacing: 1px; transition: 0.3s; }
        .hub-fair-info { color: #53fc18; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.5px; }

        .hub-card-v3:hover { transform: translateY(-12px); border-color: var(--gc); box-shadow: 0 30px 60px rgba(0,0,0,0.8), 0 0 30px color-mix(in srgb, var(--gc) 25%, transparent); }
        .hub-card-v3:hover .hub-card-v3-img { transform: scale(1.1); opacity: 0.3; filter: grayscale(0%) blur(2px); }
        .hub-card-v3:hover .hub-card-v3-emoji { transform: scale(1.15) rotate(10deg); filter: drop-shadow(0 0 30px var(--gc)); }
        .hub-card-v3:hover .hub-btn-pill { transform: scale(1.05); box-shadow: 0 10px 25px color-mix(in srgb, var(--gc) 50%, transparent); }

        :global(a), :global(a:hover), :global(a:focus) { text-decoration: none !important; }
        :global(h3), :global(h2), :global(h1) { text-decoration: none !important; border: none !important; }

        @media (max-width: 768px) {
          .hub-header-v3 h1 { font-size: 2.8rem; }
          .hub-cards-grid-v3 { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
