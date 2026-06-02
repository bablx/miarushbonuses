'use client';
import { useState } from 'react';
import { toast } from 'react-toastify';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const GRID_SIZE = 25;

export default function MinesGame({ user, onCoinsUpdate }) {
  const [mineCount, setMineCount] = useState(5);
  const [bet, setBet] = useState(10);
  const [gameActive, setGameActive] = useState(false);
  const [revealed, setRevealed] = useState([]);
  const [result, setResult] = useState(null);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fullGrid, setFullGrid] = useState(null); // stores the revealed full grid after game ends

  const startGame = async () => {
    if (!user) {
      toast.error('Please login to play');
      return;
    }
    setLoading(true);
    setResult(null);
    setFullGrid(null);
    try {
      const res = await fetch(`${API}/games/mines/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, betAmount: bet, mineCount })
      });
      const data = await res.json();
      if (data.success) {
        setGameActive(true);
        setRevealed([]);
        setCurrentMultiplier(1);
        onCoinsUpdate(data.coins);
        toast.info('💣 Mines placed! Pick safe tiles to earn multipliers.');
      } else {
        toast.error(data.message || 'Failed to start game');
      }
    } catch (e) {
      toast.error('Connection error to server');
    }
    setLoading(false);
  };

  const reveal = async (index) => {
    if (!gameActive || revealed.find(r => r.index === index) || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/games/mines/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, index })
      });
      const data = await res.json();
      if (!data.success) {
        setResult({ error: data.message });
        toast.error(data.message);
        setGameActive(false);
        setLoading(false);
        return;
      }

      const { status, result: outcome, payout, multiplier } = data;

      if (status === 'ended') {
        setGameActive(false);
        setFullGrid(data.grid);
        if (outcome === 'loss') {
          setRevealed(prev => [...prev, { index, safe: false }]);
          setResult({ result: 'loss', payout: 0 });
          toast.error('💥 BOOM! You hit a mine.');
        } else if (outcome === 'win') {
          setRevealed(prev => [...prev, { index, safe: true }]);
          setResult({ result: 'win', payout });
          onCoinsUpdate(data.coins);
          toast.success(`🏆 CONQUERED! All safe tiles cleared for ${payout} coins! 🎉`);
        }
      } else {
        setRevealed(prev => [...prev, { index, safe: true }]);
        setCurrentMultiplier(multiplier);
      }
    } catch (e) {
      toast.error('Server connection error');
      setGameActive(false);
    }
    setLoading(false);
  };

  const cashout = async () => {
    if (!gameActive || revealed.filter(r => r.safe).length === 0 || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/games/mines/cashout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username })
      });
      const data = await res.json();
      if (data.success) {
        setGameActive(false);
        setFullGrid(data.grid);
        setResult({ result: 'win', payout: data.payout });
        onCoinsUpdate(data.coins);
        toast.success(`💸 Cashed out ${data.payout} coins successfully! 🎉`);
      } else {
        toast.error(data.message || 'Cashout failed');
      }
    } catch (e) {
      toast.error('Server error during cashout');
    }
    setLoading(false);
  };

  const payoutValue = Math.floor(bet * currentMultiplier);

  return (
    <div className="gp-wrap">
      <div className="mines-display">
        {!gameActive && !result && (
          <div className="mines-idle">
             <div className="mines-idle-icon">💣</div>
             <p>Select mines and start playing!</p>
          </div>
        )}

        {result && (
          <div className={`mines-result-overlay ${result.result === 'win' ? 'win' : 'loss'}`}>
            <div className="res-icon">{result.result === 'win' ? '🏆' : '💀'}</div>
            <div className="res-text">{result.result === 'win' ? `CONQUERED! +${result.payout} COINS` : `BOOM! DEFEATED`}</div>
            <button className="gp-adj" onClick={() => setResult(null)}>PLAY AGAIN</button>
          </div>
        )}

        {(gameActive || (result && !result.error)) && (
          <div className="mines-grid">
            {Array.from({ length: GRID_SIZE }).map((_, i) => {
              const cell = revealed.find(r => r.index === i);
              const isMineEnd = fullGrid && fullGrid[i] === 'mine';
              const isSafeEnd = fullGrid && fullGrid[i] === 'safe';

              let emoji = '';
              let className = 'mine-cell';

              if (cell) {
                if (cell.safe) {
                  emoji = '💎';
                  className += ' safe';
                } else {
                  emoji = '💥';
                  className += ' mine';
                }
              } else if (fullGrid) {
                if (isMineEnd) {
                  emoji = '💣';
                  className += ' mine-unrevealed';
                } else if (isSafeEnd) {
                  emoji = '💎';
                  className += ' safe-unrevealed';
                }
              }

              return (
                <button 
                  key={i} 
                  className={className} 
                  onClick={() => reveal(i)}
                  disabled={!gameActive || !!cell || loading}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="gp-controls">
        {!gameActive ? (
          <>
            <div className="mines-config">
              <label className="gp-label">NUMBER OF MINES</label>
              <div className="mines-input-row">
                 <input type="range" min={1} max={24} value={mineCount} onChange={e => setMineCount(Number(e.target.value))} className="gp-slider" style={{'--pct': `${(mineCount/24)*100}%`}} />
                 <div className="mines-count-badge">{mineCount}</div>
              </div>
            </div>

            <div className="gp-bet-row">
              <span className="gp-coin-icon">🪙</span>
              <input className="gp-bet-input" type="number" value={bet} min={1} onChange={e => setBet(Math.max(1, +e.target.value))} />
              <button className="gp-adj" onClick={() => setBet(Math.max(1, Math.floor(bet / 2)))}>½</button>
              <button className="gp-adj gp-adj-2x" style={{'--adj-c':'#f59e0b'}} onClick={() => setBet(bet * 2)}>2×</button>
            </div>

            <button className="gp-play-btn gp-play-mines" onClick={startGame} disabled={loading}>
              {loading ? 'STARTING...' : '💣 START GAME'}
            </button>
          </>
        ) : (
          <div className="mines-active-controls">
            <div className="gp-stats">
              <div className="gp-stat"><span>MINES</span><strong>{mineCount}</strong></div>
              <div className="gp-stat"><span>MULTIPLIER</span><strong>{currentMultiplier.toFixed(2)}×</strong></div>
              <div className="gp-stat"><span>CASH VALUE</span><strong>{payoutValue} 🪙</strong></div>
            </div>
            
            <button 
              className="gp-play-btn gp-cashout" 
              onClick={cashout} 
              disabled={loading || revealed.filter(r => r.safe).length === 0}
            >
              {revealed.filter(r => r.safe).length === 0 ? 'PICK A TILE FIRST' : `💰 CASHOUT ${payoutValue} 🪙`}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        ${sharedStyles}
        .mines-display {
          min-height: 350px;
          background: rgba(0,0,0,0.3);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
        }
        .mines-idle { text-align: center; }
        .mines-idle-icon { font-size: 4rem; margin-bottom: 12px; }
        .mines-idle p { color: rgba(255,255,255,0.3); font-weight: 600; }

        .mines-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          width: 100%;
          max-width: 320px;
        }
        .mine-cell {
          aspect-ratio: 1;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          font-size: 1.5rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .mine-cell:hover:not(:disabled) {
          background: rgba(245,158,11,0.1);
          border-color: #f59e0b;
          transform: scale(1.05);
        }
        .mine-cell.safe { background: rgba(83,252,24,0.15); border-color: #53fc18; }
        .mine-cell.mine { background: rgba(239,68,68,0.2); border-color: #ef4444; animation: shake 0.3s; }

        .mine-cell.mine-unrevealed {
          background: rgba(239,68,68,0.05);
          border-color: rgba(239,68,68,0.3);
          opacity: 0.5;
        }
        .mine-cell.safe-unrevealed {
          background: rgba(83,252,24,0.03);
          border-color: rgba(83,252,24,0.2);
          opacity: 0.45;
        }

        .mines-result-overlay {
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
          animation: fadeIn 0.3s;
        }
        .res-icon { font-size: 4rem; }
        .res-text { font-size: 1.5rem; font-weight: 900; color: #fff; letter-spacing: 1px; }

        .mines-config { display: flex; flex-direction: column; gap: 8px; }
        .mines-input-row { display: flex; align-items: center; gap: 16px; }
        .mines-count-badge {
          background: #f59e0b;
          color: #000;
          font-weight: 900;
          padding: 4px 12px;
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .gp-play-mines { background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; }
        .gp-cashout {
          background: linear-gradient(135deg, #53fc18, #10b981);
          color: #000;
          font-weight: 950;
          box-shadow: 0 10px 25px rgba(83, 252, 24, 0.25);
          animation: pulse 2s infinite;
        }
        .gp-cashout:hover:not(:disabled) {
          box-shadow: 0 15px 35px rgba(83, 252, 24, 0.45);
        }
        .gp-cashout:disabled {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.25);
          box-shadow: none;
          cursor: not-allowed;
          animation: none;
        }

        .mines-active-controls {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
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
  .gp-label { font-size: 0.65rem; font-weight: 900; letter-spacing: 2px; color: rgba(255,255,255,0.3); }
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
  .gp-slider { width: 100%; height: 6px; cursor: pointer; border-radius: 3px; accent-color: #f59e0b; }
`;
