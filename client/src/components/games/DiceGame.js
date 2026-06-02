'use client';
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function DiceGame({ user, onCoinsUpdate }) {
  const [target, setTarget]       = useState(50);
  const [direction, setDirection] = useState('over');
  const [bet, setBet]             = useState(10);
  const [rolling, setRolling]     = useState(false);
  const [result, setResult]       = useState(null);

  const chance     = direction === 'over' ? (100 - target) : target;
  const multiplier = chance > 0 ? (98 / chance).toFixed(2) : '0.00';
  const payout     = Math.floor(bet * multiplier);

  const roll = async () => {
    if (!user || rolling) return;
    setRolling(true);
    setResult(null);
    try {
      const res  = await fetch(`${API}/games/play`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user.username, game: 'dice', betAmount: bet, params: { target, direction } }) });
      const data = await res.json();
      if (data.success) { setResult(data); onCoinsUpdate(data.coins); }
      else               setResult({ error: data.message });
    } catch { setResult({ error: 'Server error' }); }
    setRolling(false);
  };

  const win = result?.result === 'win';
  const loss = result?.result === 'loss';

  return (
    <div className="gp-wrap">
      <div className={`gp-result-box ${win ? 'gp-win' : loss ? 'gp-loss' : ''}`}>
        {result?.error ? (
          <div className="gp-err">{result.error}</div>
        ) : result ? (
          <>
            <div className="gp-big-num" style={{ color: win ? '#53fc18' : '#ef4444' }}>{result.details.roll}</div>
            <div className="gp-verdict">{win ? `🎉 WIN  +${result.payout} COINS` : `💔 LOSE  −${bet} COINS`}</div>
          </>
        ) : (
          <div className="gp-idle">
            <div className="gp-idle-icon">{rolling ? <span className="gp-spin">🎲</span> : '🎲'}</div>
            <div className="gp-idle-text">{rolling ? 'Rolling…' : 'Set your bet and roll!'}</div>
          </div>
        )}
      </div>

      <div className="gp-controls">
        <div className="gp-dir-row">
          <button className={`gp-dir ${direction === 'under' ? 'gp-dir-active' : ''}`} onClick={() => setDirection('under')}>UNDER</button>
          <div className="gp-target-num">{target}</div>
          <button className={`gp-dir ${direction === 'over' ? 'gp-dir-active' : ''}`} onClick={() => setDirection('over')}>OVER</button>
        </div>

        <div className="gp-slider-wrap">
          <input type="range" min={2} max={98} value={target} onChange={e => setTarget(+e.target.value)} className="gp-slider" style={{ '--pct': `${target}%` }} />
          <div className="gp-slider-labels"><span>2</span><span>50</span><span>98</span></div>
        </div>

        <div className="gp-stats">
          <div className="gp-stat"><span>WIN CHANCE</span><strong>{chance}%</strong></div>
          <div className="gp-stat"><span>MULTIPLIER</span><strong>{multiplier}×</strong></div>
          <div className="gp-stat"><span>PAYOUT</span><strong>{payout} 🪙</strong></div>
        </div>

        <div className="gp-bet-row">
          <span className="gp-coin-icon">🪙</span>
          <input className="gp-bet-input" type="number" value={bet} min={1} onChange={e => setBet(Math.max(1, +e.target.value))} />
          <button className="gp-adj" onClick={() => setBet(Math.max(1, Math.floor(bet / 2)))}>½</button>
          <button className="gp-adj gp-adj-2x" onClick={() => setBet(bet * 2)}>2×</button>
        </div>

        <button className="gp-play-btn gp-play-dice" onClick={roll} disabled={rolling}>
          {rolling ? <><span className="gp-spin">🎲</span> ROLLING…</> : '🎲  ROLL DICE'}
        </button>
      </div>

      <style jsx>{`
        ${sharedStyles}
        .gp-play-dice { background: linear-gradient(135deg, #00f2ff, #0088ff); color: #000; }
        .gp-play-dice:hover:not(:disabled) { box-shadow: 0 0 32px rgba(0,242,255,0.5); }
        .gp-dir-active { background: #00f2ff !important; color: #000 !important; border-color: #00f2ff !important; }
        .gp-slider { accent-color: #00f2ff; }
      `}</style>
    </div>
  );
}

const sharedStyles = `
  .gp-wrap { display: flex; flex-direction: column; gap: 0; }
  .gp-result-box {
    min-height: 160px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 24px;
    background: rgba(0,0,0,0.3);
    border-bottom: 1px solid rgba(255,255,255,0.05);
    transition: background 0.3s;
    text-align: center;
    gap: 8px;
  }
  .gp-win { background: rgba(83,252,24,0.06); }
  .gp-loss { background: rgba(239,68,68,0.06); }
  .gp-big-num { font-size: 5rem; font-weight: 900; line-height: 1; letter-spacing: -2px; }
  .gp-verdict { font-size: 1rem; font-weight: 800; letter-spacing: 1.5px; color: #fff; }
  .gp-err { color: #ef4444; font-weight: 700; font-size: 0.95rem; }
  .gp-idle-icon { font-size: 3.5rem; margin-bottom: 8px; }
  .gp-idle-text { color: rgba(255,255,255,0.35); font-size: 0.9rem; font-weight: 600; letter-spacing: 0.5px; }
  .gp-controls { display: flex; flex-direction: column; gap: 20px; padding: 28px 24px; }
  .gp-dir-row { display: flex; align-items: center; gap: 12px; }
  .gp-dir {
    flex: 1;
    padding: 12px;
    border-radius: 12px;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.4);
    font-weight: 900;
    font-size: 0.85rem;
    letter-spacing: 1.5px;
    cursor: pointer;
    transition: all 0.25s;
  }
  .gp-dir:hover { border-color: rgba(255,255,255,0.3); color: #fff; }
  .gp-target-num { font-size: 2.5rem; font-weight: 900; color: #fff; min-width: 70px; text-align: center; }
  .gp-slider-wrap { display: flex; flex-direction: column; gap: 6px; }
  .gp-slider { width: 100%; height: 6px; cursor: pointer; border-radius: 3px; }
  .gp-slider-labels { display: flex; justify-content: space-between; font-size: 0.7rem; color: rgba(255,255,255,0.25); font-weight: 700; }
  .gp-stats {
    display: grid;
    grid-template-columns: repeat(3,1fr);
    gap: 12px;
  }
  .gp-stat {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 14px;
    padding: 14px 10px;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .gp-stat span { font-size: 0.6rem; font-weight: 800; color: rgba(255,255,255,0.3); letter-spacing: 1.5px; text-transform: uppercase; }
  .gp-stat strong { font-size: 1.1rem; font-weight: 900; color: #fff; }
  .gp-bet-row {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(0,0,0,0.35);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    padding: 6px 14px;
  }
  .gp-coin-icon { font-size: 1.3rem; }
  .gp-bet-input {
    flex: 1;
    background: transparent;
    border: none;
    color: #fff;
    font-size: 1.2rem;
    font-weight: 900;
    outline: none;
    font-family: inherit;
  }
  .gp-adj {
    padding: 8px 16px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.05);
    color: rgba(255,255,255,0.5);
    font-weight: 900;
    font-size: 0.85rem;
    cursor: pointer;
    transition: 0.2s;
  }
  .gp-adj:hover { background: rgba(255,255,255,0.1); color: #fff; }
  .gp-adj-2x { border-color: rgba(0,242,255,0.2); color: #00f2ff; background: rgba(0,242,255,0.05); }
  .gp-adj-2x:hover { background: rgba(0,242,255,0.12); }
  .gp-play-btn {
    width: 100%;
    padding: 18px;
    border: none;
    border-radius: 16px;
    font-size: 1.05rem;
    font-weight: 900;
    letter-spacing: 2px;
    cursor: pointer;
    transition: all 0.25s;
    font-family: inherit;
  }
  .gp-play-btn:hover:not(:disabled) { transform: translateY(-2px); }
  .gp-play-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .gp-spin { display: inline-block; animation: gp-spin 0.6s linear infinite; }
  @keyframes gp-spin { to { transform: rotate(360deg); } }
  @keyframes gp-pop { 0% { transform: scale(0.8); opacity: 0; } 60% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
`;
