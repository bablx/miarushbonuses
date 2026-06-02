'use client';
import { useState } from 'react';
import { toast } from 'react-toastify';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const LEVELS = 5;
const EGGS_PER_LEVEL = 3;

export default function DragonTowerGame({ user, onCoinsUpdate }) {
  const [bet, setBet] = useState(10);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [picks, setPicks] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const startGame = async () => {
    if (!user) {
      toast.error('Please login to play');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API}/games/dragon_tower/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, betAmount: bet })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentLevel(1);
        setPicks([]);
        onCoinsUpdate(data.coins);
      } else {
        toast.error(data.message || 'Failed to start climb');
      }
    } catch (e) {
      toast.error('Connection error to server');
    }
    setLoading(false);
  };

  const pickEgg = async (eggIndex) => {
    if (loading || currentLevel === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/games/dragon_tower/pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, eggIndex })
      });
      const data = await res.json();
      if (!data.success) {
        setResult({ error: data.message });
        toast.error(data.message);
        setLoading(false);
        return;
      }

      const { status, result: outcome, payout, currentLevel: nextLevel, details } = data;
      const hitBad = details.hitBad;

      setPicks(prev => [...prev, { level: currentLevel, pick: eggIndex, hitBad }]);

      if (hitBad) {
        setResult({ result: 'loss', payout: 0, level: currentLevel });
        setCurrentLevel(0);
        toast.error('💥 BOOM! Hit a bad egg.');
      } else if (status === 'ended' && outcome === 'win') {
        setResult({ result: 'win', payout, multiplier: details.multiplier });
        setCurrentLevel(0);
        onCoinsUpdate(data.coins);
        toast.success(`🏆 CONQUERED! Won ${payout} coins! 🎉`);
      } else {
        setCurrentLevel(nextLevel);
      }
    } catch (e) {
      setResult({ error: 'Server error' });
      toast.error('Server error occurred');
    }
    setLoading(false);
  };

  const cashout = async () => {
    if (loading || currentLevel <= 1) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/games/dragon_tower/cashout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username })
      });
      const data = await res.json();
      if (data.success) {
        setResult({ result: 'win', payout: data.payout, multiplier: data.details.multiplier });
        setCurrentLevel(0);
        onCoinsUpdate(data.coins);
        toast.success(`💸 Cashed out ${data.payout} coins! 🎉`);
      } else {
        toast.error(data.message || 'Cashout failed');
      }
    } catch (e) {
      toast.error('Connection error during cashout');
    }
    setLoading(false);
  };

  const currentMultiplier = currentLevel > 0 ? Math.pow(1.5, currentLevel - 1).toFixed(2) : 1;
  const nextMultiplier = Math.pow(1.5, currentLevel || 1).toFixed(2);

  return (
    <div className="gp-wrap">
      <div className="tower-display">
        {currentLevel === 0 && !result && (
          <div className="tower-idle">
            <div className="tower-idle-icon">🐉</div>
            <h3>Climb the Tower</h3>
            <p>Each floor has 3 eggs. Pick the safe one to go up.</p>
          </div>
        )}

        {result && (
          <div className={`tower-result-overlay ${result.result === 'win' ? 'win' : 'loss'}`}>
            <div className="res-icon">{result.result === 'win' ? '🏆' : '💀'}</div>
            <div className="res-text">{result.result === 'win' ? `CONQUERED! +${result.payout} COINS` : `DEFEATED! -${bet} COINS`}</div>
            <button className="gp-adj" onClick={() => setResult(null)}>PLAY AGAIN</button>
          </div>
        )}

        {(currentLevel > 0 || result) && (
          <div className="tower-grid">
            {Array.from({ length: LEVELS }, (_, i) => LEVELS - i).map(level => {
              const pick = picks.find(p => p.level === level);
              const isActive = level === currentLevel;
              return (
                <div key={level} className={`tower-row ${isActive ? 'active' : ''} ${pick ? (pick.hitBad ? 'failed' : 'passed') : ''}`}>
                  <div className="row-label">FL {level}</div>
                  <div className="tower-eggs">
                    {Array.from({ length: EGGS_PER_LEVEL }).map((_, ei) => {
                      const isMyPick = pick && pick.pick === ei;
                      return (
                        <button 
                          key={ei} 
                          className={`egg-btn ${isMyPick ? (pick.hitBad ? 'egg-bad' : 'egg-good') : ''}`}
                          onClick={() => isActive && pickEgg(ei)} 
                          disabled={!isActive || loading}
                        >
                          {isMyPick ? (pick.hitBad ? '💥' : '💎') : '🥚'}
                        </button>
                      );
                    })}
                  </div>
                  <div className="row-mult">{Math.pow(1.5, level).toFixed(2)}x</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="gp-controls">
        {currentLevel === 0 ? (
          <>
            <div className="gp-bet-row">
              <span className="gp-coin-icon">🪙</span>
              <input className="gp-bet-input" type="number" value={bet} min={1} onChange={e => setBet(Math.max(1, +e.target.value))} />
              <button className="gp-adj" onClick={() => setBet(Math.max(1, Math.floor(bet / 2)))}>½</button>
              <button className="gp-adj gp-adj-2x" style={{'--adj-c':'#ef4444'}} onClick={() => setBet(bet * 2)}>2×</button>
            </div>
            <button className="gp-play-btn gp-play-tower" onClick={startGame} disabled={loading}>
              {loading ? 'STARTING...' : '🐉 CLIMB TOWER'}
            </button>
          </>
        ) : (
          <div className="tower-active-controls">
            <div className="gp-stats">
              <div className="gp-stat"><span>CURRENT</span><strong>{currentMultiplier}×</strong></div>
              <div className="gp-stat"><span>NEXT</span><strong>{nextMultiplier}×</strong></div>
              <div className="gp-stat"><span>CASHVALUE</span><strong>{Math.floor(bet * currentMultiplier)} 🪙</strong></div>
            </div>
            <button 
              className="gp-play-btn gp-cashout-tower" 
              onClick={cashout} 
              disabled={loading || currentLevel <= 1}
            >
              {currentLevel <= 1 ? 'MAKE A PICK FIRST' : `💸 CASHOUT ${Math.floor(bet * currentMultiplier)} 🪙`}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        ${sharedStyles}
        .tower-display {
          min-height: 400px;
          background: rgba(0,0,0,0.3);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .tower-idle { text-align: center; }
        .tower-idle-icon { font-size: 4rem; margin-bottom: 16px; animation: float 2s infinite alternate; }
        .tower-idle h3 { color: #fff; font-weight: 900; font-size: 1.5rem; margin-bottom: 8px; }
        .tower-idle p { color: rgba(255,255,255,0.3); max-width: 240px; margin: 0 auto; line-height: 1.5; }

        .tower-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          max-width: 360px;
        }
        .tower-row {
          display: flex;
          align-items: center;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 8px 16px;
          gap: 16px;
          transition: all 0.3s;
        }
        .tower-row.active {
          background: rgba(239,68,68,0.1);
          border-color: #ef4444;
          box-shadow: 0 0 20px rgba(239,68,68,0.1);
          transform: scale(1.02);
        }
        .tower-row.passed { opacity: 0.6; border-color: #53fc18; }
        .tower-row.failed { border-color: #ef4444; opacity: 0.6; }

        .row-label { font-size: 0.7rem; font-weight: 900; color: rgba(255,255,255,0.25); min-width: 40px; }
        .tower-eggs { display: flex; gap: 12px; flex: 1; justify-content: center; }
        .egg-btn {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .egg-btn:hover:not(:disabled) { background: rgba(239,68,68,0.15); border-color: #ef4444; transform: scale(1.1); }
        .egg-btn.egg-good { background: rgba(83,252,24,0.2); border-color: #53fc18; }
        .egg-btn.egg-bad { background: rgba(239,68,68,0.2); border-color: #ef4444; animation: shake 0.3s; }
        .row-mult { font-size: 0.8rem; font-weight: 900; color: #ef4444; min-width: 50px; text-align: right; }

        .tower-result-overlay {
          position: absolute;
          inset: 0;
          z-index: 10;
          backdrop-filter: blur(8px);
          background: rgba(0,0,0,0.6);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .gp-play-tower { background: linear-gradient(135deg, #ef4444, #991b1b); color: #fff; }
        .gp-play-tower:hover:not(:disabled) { box-shadow: 0 0 32px rgba(239,68,68,0.4); }

        .tower-active-controls {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }
        .gp-cashout-tower {
          background: linear-gradient(135deg, #f59e0b, #ef4444);
          color: #fff;
          font-weight: 950;
          box-shadow: 0 10px 25px rgba(245, 158, 11, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 2s infinite;
        }
        .gp-cashout-tower:hover:not(:disabled) {
          box-shadow: 0 15px 35px rgba(245, 158, 11, 0.45);
        }
        .gp-cashout-tower:disabled {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.25);
          box-shadow: none;
          cursor: not-allowed;
          animation: none;
        }

        @keyframes float { from { transform: translateY(0); } to { transform: translateY(-10px); } }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.01); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

const sharedStyles = `
  .gp-wrap { display: flex; flex-direction: column; }
  .gp-controls { display: flex; flex-direction: column; gap: 20px; padding: 28px 24px; }
  .gp-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .gp-stat { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 14px 10px; text-align: center; display: flex; flex-direction: column; gap: 6px; }
  .gp-stat span { font-size: 0.6rem; font-weight: 800; color: rgba(255,255,255,0.3); letter-spacing: 1.5px; }
  .gp-stat strong { font-size: 1.1rem; font-weight: 900; color: #fff; }
  .gp-bet-row { display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 6px 14px; }
  .gp-coin-icon { font-size: 1.3rem; }
  .gp-bet-input { flex: 1; background: transparent; border: none; color: #fff; font-size: 1.2rem; font-weight: 900; outline: none; font-family: inherit; }
  .gp-adj { padding: 8px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.5); font-weight: 900; font-size: 0.85rem; cursor: pointer; transition: 0.2s; }
  .gp-adj:hover { background: rgba(255,255,255,0.1); color: #fff; }
  .gp-play-btn { width: 100%; padding: 18px; border: none; border-radius: 16px; font-size: 1.05rem; font-weight: 900; letter-spacing: 2px; cursor: pointer; transition: all 0.25s; font-family: inherit; }
  .gp-play-btn:hover:not(:disabled) { transform: translateY(-2px); }
  .gp-play-btn:disabled { opacity: 0.45; cursor: not-allowed; }
`;
