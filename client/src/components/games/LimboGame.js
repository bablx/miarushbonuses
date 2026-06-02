'use client';
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function LimboGame({ user, onCoinsUpdate }) {
  const [targetMultiplier, setTarget] = useState(2.0);
  const [bet, setBet]                 = useState(10);
  const [playing, setPlaying]         = useState(false);
  const [result, setResult]           = useState(null);
  const [animValue, setAnimValue]     = useState(null);

  const winChance = Math.max(1, Math.min(99, parseFloat((97 / targetMultiplier).toFixed(1))));
  const payout    = Math.floor(bet * targetMultiplier);

  const play = async () => {
    if (!user || playing) return;
    setPlaying(true);
    setResult(null);
    setAnimValue(1.0);
    try {
      const res  = await fetch(`${API}/games/play`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user.username, game: 'limbo', betAmount: bet, params: { targetMultiplier } }) });
      const data = await res.json();
      if (data.success) {
        const tgt  = data.details.randomMultiplier;
        const step = Math.max(0.05, tgt / 25);
        let count  = 1.0;
        const iv   = setInterval(() => {
          count = parseFloat((count + step).toFixed(2));
          if (count >= tgt) { count = tgt; clearInterval(iv); }
          setAnimValue(count);
        }, 40);
        setTimeout(() => { setResult(data); onCoinsUpdate(data.coins); }, 1100);
      } else {
        setResult({ error: data.message });
      }
    } catch { setResult({ error: 'Server error' }); }
    setPlaying(false);
  };

  const win  = result?.result === 'win';
  const loss = result?.result === 'loss';
  const displayVal = animValue !== null ? `${animValue}x` : result ? `${result.details?.randomMultiplier}x` : '—';

  return (
    <div className="gp-wrap">
      <div className={`limbo-display ${win ? 'limbo-win' : loss ? 'limbo-loss' : playing ? 'limbo-live' : ''}`}>
        <div className="limbo-rocket">🚀</div>
        <div className={`limbo-num ${win ? 'lnum-win' : loss ? 'lnum-loss' : ''}`}>{displayVal}</div>
        {result && !result.error && (
          <div className="limbo-verdict">{win ? `🎉 WIN  +${result.payout} COINS` : `💔 LOSE  −${bet} COINS`}</div>
        )}
        {result?.error && <div className="gp-err">{result.error}</div>}
        {!playing && !result && <div className="limbo-hint">Target: ≥ {targetMultiplier}×</div>}
      </div>

      <div className="gp-controls">
        <div className="limbo-target-section">
          <label className="gp-label">TARGET MULTIPLIER</label>
          <div className="limbo-mult-row">
            <button className="limbo-pm" onClick={() => setTarget(t => Math.max(1.01, parseFloat((t - 0.5).toFixed(2))))}>−</button>
            <input
              className="limbo-mult-input"
              type="number"
              value={targetMultiplier}
              min={1.01}
              step={0.5}
              onChange={e => setTarget(Math.max(1.01, parseFloat(e.target.value) || 1.01))}
            />
            <button className="limbo-pm" onClick={() => setTarget(t => parseFloat((t + 0.5).toFixed(2)))}>+</button>
          </div>
          <div className="limbo-presets">
            {[1.5, 2, 5, 10, 25].map(v => (
              <button key={v} className={`limbo-preset ${targetMultiplier === v ? 'limbo-preset-active' : ''}`} onClick={() => setTarget(v)}>{v}×</button>
            ))}
          </div>
        </div>

        <div className="gp-stats">
          <div className="gp-stat"><span>WIN CHANCE</span><strong>{winChance}%</strong></div>
          <div className="gp-stat"><span>MULTIPLIER</span><strong>{targetMultiplier}×</strong></div>
          <div className="gp-stat"><span>PAYOUT</span><strong>{payout} 🪙</strong></div>
        </div>

        <div className="gp-bet-row">
          <span className="gp-coin-icon">🪙</span>
          <input className="gp-bet-input" type="number" value={bet} min={1} onChange={e => setBet(Math.max(1, +e.target.value))} />
          <button className="gp-adj" onClick={() => setBet(Math.max(1, Math.floor(bet / 2)))}>½</button>
          <button className="gp-adj gp-adj-2x" style={{'--adj-c':'#a855f7'}} onClick={() => setBet(bet * 2)}>2×</button>
        </div>

        <button className="gp-play-btn gp-play-limbo" onClick={play} disabled={playing}>
          {playing ? '⏳ LAUNCHING…' : '🚀  LAUNCH LIMBO'}
        </button>
      </div>

      <style jsx>{`
        ${sharedStyles}
        .limbo-display {
          min-height: 200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 36px 24px;
          background: rgba(0,0,0,0.35);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          text-align: center;
          transition: background 0.4s;
          position: relative;
          overflow: hidden;
        }
        .limbo-win  { background: rgba(83,252,24,0.06); }
        .limbo-loss { background: rgba(239,68,68,0.06); }
        .limbo-live { background: rgba(168,85,247,0.06); }

        .limbo-rocket { font-size: 3rem; animation: ${playing ? 'limbo-float 0.8s ease-in-out infinite alternate' : 'none'}; }
        @keyframes limbo-float { from { transform: translateY(0); } to { transform: translateY(-10px); } }

        .limbo-num { font-size: 5rem; font-weight: 900; letter-spacing: -2px; color: #fff; line-height: 1; transition: color 0.3s; }
        .lnum-win  { color: #53fc18; text-shadow: 0 0 40px rgba(83,252,24,0.5); }
        .lnum-loss { color: #ef4444; }

        .limbo-verdict { font-size: 1rem; font-weight: 800; letter-spacing: 1.5px; color: #fff; }
        .limbo-hint    { font-size: 0.8rem; color: rgba(255,255,255,0.25); font-weight: 700; letter-spacing: 1px; }

        .limbo-target-section { display: flex; flex-direction: column; gap: 10px; }
        .gp-label { font-size: 0.65rem; font-weight: 900; letter-spacing: 2px; color: rgba(255,255,255,0.3); }
        .limbo-mult-row { display: flex; align-items: center; gap: 10px; }
        .limbo-pm {
          width: 44px; height: 44px;
          border-radius: 12px;
          background: rgba(168,85,247,0.1);
          border: 1px solid rgba(168,85,247,0.3);
          color: #a855f7;
          font-size: 1.5rem;
          font-weight: 900;
          cursor: pointer;
          transition: 0.2s;
          flex-shrink: 0;
        }
        .limbo-pm:hover { background: rgba(168,85,247,0.2); }
        .limbo-mult-input {
          flex: 1;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(168,85,247,0.2);
          border-radius: 12px;
          color: #fff;
          font-size: 2rem;
          font-weight: 900;
          text-align: center;
          padding: 10px;
          outline: none;
          font-family: inherit;
        }

        .limbo-presets { display: flex; gap: 8px; }
        .limbo-preset {
          flex: 1;
          padding: 8px 4px;
          border-radius: 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.4);
          font-weight: 800;
          font-size: 0.8rem;
          cursor: pointer;
          transition: 0.2s;
        }
        .limbo-preset:hover { border-color: #a855f7; color: #a855f7; }
        .limbo-preset-active { background: rgba(168,85,247,0.15); border-color: #a855f7; color: #a855f7; }

        .gp-play-limbo { background: linear-gradient(135deg, #a855f7, #6d28d9); color: #fff; }
        .gp-play-limbo:hover:not(:disabled) { box-shadow: 0 0 32px rgba(168,85,247,0.5); }
        .gp-adj-2x { border-color: rgba(168,85,247,0.3) !important; color: #a855f7 !important; background: rgba(168,85,247,0.07) !important; }
      `}</style>
    </div>
  );
}

const sharedStyles = `
  .gp-wrap { display:flex; flex-direction:column; }
  .gp-controls { display:flex; flex-direction:column; gap:20px; padding:28px 24px; }
  .gp-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
  .gp-stat { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:14px; padding:14px 10px; text-align:center; display:flex; flex-direction:column; gap:6px; }
  .gp-stat span { font-size:0.6rem; font-weight:800; color:rgba(255,255,255,0.3); letter-spacing:1.5px; }
  .gp-stat strong { font-size:1.1rem; font-weight:900; color:#fff; }
  .gp-bet-row { display:flex; align-items:center; gap:10px; background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:6px 14px; }
  .gp-coin-icon { font-size:1.3rem; }
  .gp-bet-input { flex:1; background:transparent; border:none; color:#fff; font-size:1.2rem; font-weight:900; outline:none; font-family:inherit; }
  .gp-adj { padding:8px 16px; border-radius:10px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.5); font-weight:900; font-size:0.85rem; cursor:pointer; transition:0.2s; }
  .gp-adj:hover { background:rgba(255,255,255,0.1); color:#fff; }
  .gp-play-btn { width:100%; padding:18px; border:none; border-radius:16px; font-size:1.05rem; font-weight:900; letter-spacing:2px; cursor:pointer; transition:all 0.25s; font-family:inherit; display:flex; align-items:center; justify-content:center; gap:10px; }
  .gp-play-btn:hover:not(:disabled) { transform:translateY(-2px); }
  .gp-play-btn:disabled { opacity:0.45; cursor:not-allowed; }
  .gp-err { color:#ef4444; font-weight:700; font-size:0.95rem; }
`;
