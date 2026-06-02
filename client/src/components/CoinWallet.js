'use client';
import { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function CoinWallet({ user, onCoinsUpdate }) {
  const [coins, setCoins] = useState(user?.coins || 0);
  const [canClaim, setCanClaim] = useState(false);
  const [nextClaimAt, setNextClaimAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState('');

  useEffect(() => { 
    if (!user?.username) return;
    
    const fetchBalance = async () => {
      try {
        const res = await fetch(`${API}/coins/balance/${user.username}`);
        const data = await res.json();
        if (data.success) {
          setCoins(data.coins);
          setCanClaim(data.canClaim);
          setNextClaimAt(data.nextClaimAt);
          
          if (onCoinsUpdate && data.coins !== user.coins) {
            onCoinsUpdate(data.coins);
          }
        }
      } catch (e) {}
    };

    fetchBalance();
  }, [user?.username]);

  useEffect(() => {
    if (!nextClaimAt || canClaim) { setTimeLeft(''); return; }
    const interval = setInterval(() => {
      const diff = nextClaimAt - Date.now();
      if (diff <= 0) { setCanClaim(true); setTimeLeft(''); clearInterval(interval); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [nextClaimAt, canClaim]);

  const handleClaim = async () => {
    if (!user || !canClaim || claiming) return;
    setClaiming(true);
    try {
      const res = await fetch(`${API}/coins/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username })
      });
      const data = await res.json();
      if (data.success) {
        setCoins(data.coins);
        setCanClaim(false);
        setNextClaimAt(data.nextClaimAt);
        setClaimMsg('+20 🎉');
        if (onCoinsUpdate) onCoinsUpdate(data.coins);
        setTimeout(() => setClaimMsg(''), 3000);
      }
    } catch (e) {}
    setClaiming(false);
  };

  if (!user) return null;

  return (
    <div className="coin-wallet-mini">
      <div className="wallet-main">
        <div className="balance-info">
          <span className="coin-icon">🪙</span>
          <span className="coin-val">{coins.toLocaleString()}</span>
        </div>
        
        <div className="claim-section">
          {claimMsg && <span className="claim-popup">{claimMsg}</span>}
          {canClaim ? (
            <button className="claim-btn-mini active" onClick={handleClaim} disabled={claiming}>
              {claiming ? '...' : 'CLAIM 20'}
            </button>
          ) : (
            <div className="claim-timer-mini">🎁 {timeLeft}</div>
          )}
        </div>
      </div>

      <style jsx>{`
        .coin-wallet-mini {
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 8px 15px;
          border-radius: 12px;
          display: inline-block;
          backdrop-filter: blur(10px);
        }
        .wallet-main { display: flex; align-items: center; gap: 20px; }
        .balance-info { display: flex; align-items: center; gap: 8px; }
        .coin-icon { font-size: 1.2rem; }
        .coin-val { font-weight: 900; color: #f59e0b; font-size: 1.1rem; }
        
        .claim-section { position: relative; display: flex; align-items: center; }
        .claim-btn-mini {
          background: linear-gradient(135deg, #53fc18, #00f2ff);
          border: none;
          padding: 6px 15px;
          border-radius: 8px;
          color: #000;
          font-weight: 900;
          font-size: 0.75rem;
          cursor: pointer;
          transition: 0.3s;
        }
        .claim-btn-mini:hover { transform: scale(1.05); box-shadow: 0 0 15px rgba(83,252,24,0.4); }
        .claim-timer-mini { font-size: 0.75rem; color: rgba(255,255,255,0.5); font-weight: 800; }
        .claim-popup {
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          color: #53fc18;
          font-weight: 900;
          font-size: 0.8rem;
          animation: floatUp 2s forwards;
        }
        @keyframes floatUp {
          0% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -20px); }
        }
      `}</style>
    </div>
  );
}
