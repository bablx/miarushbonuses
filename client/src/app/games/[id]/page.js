'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import CoinWallet from '@/components/CoinWallet';
import DiceGame from '@/components/games/DiceGame';
import LimboGame from '@/components/games/LimboGame';
import MinesGame from '@/components/games/MinesGame';
import DragonTowerGame from '@/components/games/DragonTowerGame';
import ChickenGame from '@/components/games/ChickenGame';
import KenoGame from '@/components/games/KenoGame';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const GAMES_META = {
  dice:         { name: 'DICE',         emoji: '🎲', component: DiceGame,        color: '#00f2ff', tag: 'CLASSIC' },
  limbo:        { name: 'LIMBO',        emoji: '🚀', component: LimboGame,       color: '#a855f7', tag: 'HIGH RISK' },
  mines:        { name: 'MINES',        emoji: '💣', component: MinesGame,       color: '#f59e0b', tag: 'STRATEGY' },
  dragon_tower: { name: 'DRAGON TOWER', emoji: '🐉', component: DragonTowerGame, color: '#ef4444', tag: 'ADVENTURE' },
  chicken:      { name: 'CHICKEN',      emoji: '🌟', component: ChickenGame,     color: '#53fc18', tag: 'LUCKY' },
  keno:         { name: 'KENO',         emoji: '🎱', component: KenoGame,        color: '#e91e63', tag: 'LOTTERY' },
};

export default function SingleGamePage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const { id } = params;
  const game = GAMES_META[id];

  const [user, setUser]   = useState(null);
  const [coins, setCoins] = useState(0);
  const [error, setError] = useState('');

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
      } catch {}
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
    setUser(null); setCoins(0);
    window.location.replace('/games');
  };

  const startLogin = () => {
    window.location.href = `${API}/auth/kick?return_to=${encodeURIComponent(window.location.pathname)}`;
  };

  const handleCoinsUpdate = (n) => {
    setCoins(n);
    if (user) {
      const u2 = { ...user, coins: n };
      setUser(u2);
      localStorage.setItem('prism_auth_v2', JSON.stringify(u2));
    }
  };

  if (!game) return <div className="game-not-found">Game not found</div>;
  const GameComponent = game.component;

  return (
    <main className="game-page-root">
      <Navbar user={user} onLogout={handleLogout} onLoginClick={startLogin} coins={coins} />

      <div className="game-page-container">
        <div className="game-cabinet" style={{ '--gc': game.color }}>
          
          <header className="cabinet-header">
            <div className="cabinet-header-left">
              <Link href="/games" className="btn-back">
                <span className="icon">←</span>
                <span>HUB</span>
              </Link>
            </div>

            <div className="cabinet-header-center">
              <div className="game-badge-icon">{game.emoji}</div>
              <div className="game-title-meta">
                <span className="game-tag">{game.tag}</span>
                <h1 className="game-name">{game.name}</h1>
              </div>
            </div>

            <div className="cabinet-header-right">
              <CoinWallet user={user} onCoinsUpdate={handleCoinsUpdate} />
            </div>
          </header>

          <div className="cabinet-body">
            {user ? (
              <GameComponent user={user} onCoinsUpdate={handleCoinsUpdate} />
            ) : (
              <div className="cabinet-login-prompt">
                <div className="prompt-lock">🔒</div>
                <h2>GAMES ARE LOCKED</h2>
                <p>Please login from the navigation bar to start playing and earning coins.</p>
              </div>
            )}
          </div>

          <footer className="cabinet-footer">
            <div className="footer-stat"><span>🛡️</span> Provably Fair</div>
            <div className="footer-stat"><span>⚡</span> Instant Payouts</div>
            <div className="footer-stat"><span>💎</span> 24/7 Support</div>
          </footer>
        </div>
      </div>

      <style jsx>{`
        .game-page-root {
          min-height: 100vh;
          background: #080a0f;
          padding-top: 100px;
        }

        .game-page-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 40px 20px 80px;
        }

        .game-cabinet {
          background: #0d1017;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 32px;
          overflow: hidden;
          box-shadow: 0 40px 100px rgba(0,0,0,0.7),
                      inset 0 1px 0 rgba(255,255,255,0.05);
          animation: cabinet-slide 0.5s cubic-bezier(0.19, 1, 0.22, 1);
        }

        @keyframes cabinet-slide {
          from { opacity: 0; transform: translateY(30px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .cabinet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 32px;
          background: rgba(0,0,0,0.3);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .btn-back {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255,255,255,0.4);
          text-decoration: none;
          font-weight: 900;
          font-size: 0.75rem;
          letter-spacing: 2px;
          transition: 0.2s;
        }
        .btn-back:hover { color: #fff; }

        .cabinet-header-center {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .game-badge-icon {
          width: 52px;
          height: 52px;
          background: rgba(255,255,255,0.03);
          border: 1px solid color-mix(in srgb, var(--gc) 30%, transparent);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          box-shadow: 0 0 20px color-mix(in srgb, var(--gc) 15%, transparent);
        }
        .game-tag {
          display: block;
          font-size: 0.55rem;
          font-weight: 900;
          letter-spacing: 2.5px;
          color: var(--gc);
          margin-bottom: 4px;
          text-transform: uppercase;
        }
        .game-name {
          font-size: 1.4rem;
          font-weight: 900;
          color: #fff;
          margin: 0;
          line-height: 1;
          letter-spacing: 1px;
        }

        .cabinet-wallet {
          background: rgba(245,158,11,0.08);
          border: 1px solid rgba(245,158,11,0.2);
          padding: 8px 16px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .wallet-coin { font-size: 1.2rem; }
        .wallet-num { font-size: 1.2rem; font-weight: 900; color: #f59e0b; }

        .cabinet-body {
          min-height: 400px;
        }

        .cabinet-login-prompt {
          padding: 100px 40px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
        .prompt-lock { font-size: 4rem; margin-bottom: 10px; }
        .cabinet-login-prompt h2 { font-size: 2.2rem; font-weight: 900; color: #fff; margin: 0; }
        .cabinet-login-prompt p { color: var(--text-secondary); font-size: 1.1rem; max-width: 320px; line-height: 1.6; margin: 0; }
        .prompt-btn {
          background: #53fc18;
          color: #000;
          border: none;
          padding: 16px 40px;
          border-radius: 14px;
          font-weight: 900;
          font-size: 1rem;
          cursor: pointer;
          transition: 0.3s;
          box-shadow: 0 10px 30px rgba(83,252,24,0.3);
        }
        .prompt-btn:hover { transform: scale(1.05); box-shadow: 0 15px 40px rgba(83,252,24,0.5); }

        .cabinet-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 40px;
          padding: 24px;
          background: rgba(0,0,0,0.2);
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .footer-stat {
          font-size: 0.8rem;
          font-weight: 800;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .game-not-found { padding: 20vh; text-align: center; color: #fff; font-size: 2rem; font-weight: 900; }

        @media (max-width: 600px) {
          .game-page-container { padding: 20px 10px; }
          .cabinet-header { flex-direction: column; gap: 20px; padding: 24px 16px; }
          .cabinet-header-left { position: absolute; top: 24px; left: 16px; }
          .cabinet-header-right { width: 100%; justify-content: center; display: flex; }
          .cabinet-wallet { width: 100%; justify-content: center; }
          .cabinet-footer { flex-direction: column; gap: 15px; }
        }
      `}</style>
    </main>
  );
}
