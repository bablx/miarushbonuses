'use client';
import { useState } from 'react';
import { toast } from 'react-toastify';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const KENO_MULTIPLIERS = {
  low: {
    1: [0, 1.5],
    2: [0, 1, 3.2],
    3: [0, 1, 1.5, 5],
    4: [0, 1, 1.2, 3, 10],
    5: [0, 0.9, 1, 2, 8, 25],
    6: [0, 0.9, 1, 1.5, 4, 15, 60],
    7: [0, 0.9, 1, 1.2, 2.5, 10, 30, 120],
    8: [0, 0.9, 1, 1.1, 2, 6, 18, 60, 200],
    9: [0, 0.8, 0.9, 1.1, 1.5, 4, 12, 35, 100, 400],
    10: [0, 0.8, 0.9, 1, 1.3, 2.5, 8, 22, 60, 180, 600]
  },
  classic: {
    1: [0, 1.95],
    2: [0, 0.9, 4],
    3: [0, 0, 1.5, 9],
    4: [0, 0, 1.2, 4, 18],
    5: [0, 0, 1, 2.5, 10, 45],
    6: [0, 0, 1, 1.5, 6, 25, 120],
    7: [0, 0, 0.9, 1.2, 4, 12, 60, 280],
    8: [0, 0, 0.9, 1, 2.5, 7, 30, 150, 500],
    9: [0, 0, 0.8, 1, 1.8, 5, 18, 70, 250, 1000],
    10: [0, 0, 0.5, 1, 1.4, 3, 9, 30, 110, 400, 1000]
  },
  medium: {
    1: [0, 1.96],
    2: [0, 0, 5],
    3: [0, 0, 1.8, 12],
    4: [0, 0, 0, 5, 25],
    5: [0, 0, 0, 3, 15, 80],
    6: [0, 0, 0, 1.8, 8, 40, 250],
    7: [0, 0, 0, 1.5, 5, 20, 100, 500],
    8: [0, 0, 0, 1.2, 3, 10, 50, 250, 900],
    9: [0, 0, 0, 1, 2, 6, 25, 100, 450, 2000],
    10: [0, 0, 0, 1, 1.5, 4, 10, 40, 180, 800, 3000]
  },
  high: {
    1: [0, 1.98],
    2: [0, 0, 6.5],
    3: [0, 0, 0, 20],
    4: [0, 0, 0, 0, 70],
    5: [0, 0, 0, 0, 10, 250],
    6: [0, 0, 0, 0, 5, 50, 600],
    7: [0, 0, 0, 0, 3, 20, 150, 1200],
    8: [0, 0, 0, 0, 2, 10, 50, 300, 3000],
    9: [0, 0, 0, 0, 0, 5, 25, 150, 1000, 4000],
    10: [0, 0, 0, 0, 0, 4.5, 15, 80, 400, 2500, 10000]
  }
};

export default function KenoGame({ user, onCoinsUpdate }) {
  const [picks, setPicks] = useState([]);
  const [risk, setRisk] = useState('classic');
  const [bet, setBet] = useState(10);
  const [playing, setPlaying] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [drawnNumbers, setDrawnNumbers] = useState([]);
  const [tempHits, setTempHits] = useState([]);
  const [result, setResult] = useState(null);

  const clearPreviousDraw = () => {
    if (result || drawnNumbers.length > 0) {
      setPicks([]);
    }
    setResult(null);
    setDrawnNumbers([]);
    setTempHits([]);
  };

  const handleCellClick = (num) => {
    if (playing) return;
    clearPreviousDraw();

    if (picks.includes(num)) {
      setPicks(picks.filter(p => p !== num));
    } else {
      if (picks.length >= 10) {
        toast.warn('🎱 Maximum selection reached! You can select up to 10 numbers.');
        return;
      }
      setPicks([...picks, num].sort((a, b) => a - b));
    }
  };

  const autoPick = () => {
    if (playing) return;
    clearPreviousDraw();
    const available = Array.from({ length: 40 }, (_, i) => i + 1);
    const selected = [];
    for (let i = 0; i < 10; i++) {
      const randIdx = Math.floor(Math.random() * available.length);
      selected.push(available[randIdx]);
      available.splice(randIdx, 1);
    }
    selected.sort((a, b) => a - b);

    // Rapid selection sequence animation
    let count = 0;
    setPicks([]);
    const interval = setInterval(() => {
      setPicks(selected.slice(0, count + 1));
      count++;
      if (count >= 10) clearInterval(interval);
    }, 45);
  };

  const clearPicks = () => {
    if (playing) return;
    setPicks([]);
    clearPreviousDraw();
  };

  const play = async () => {
    if (!user) {
      toast.error('Please login to place bets');
      return;
    }
    if (picks.length < 1) {
      toast.warn('🎱 Please select at least 1 number to play!');
      return;
    }
    if (playing) return;

    setPlaying(true);
    setRevealing(true);
    setResult(null);
    setDrawnNumbers([]);
    setTempHits([]);

    try {
      const res = await fetch(`${API}/games/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          game: 'keno',
          betAmount: bet,
          params: { picks, risk }
        })
      });
      const data = await res.json();
      if (data.success) {
        const drawnSeq = data.details.drawn;
        const activeHits = [];
        const activeDraws = [];

        // Sequential ball reveal effect
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 200));
          const num = drawnSeq[i];
          activeDraws.push(num);
          setDrawnNumbers([...activeDraws]);
          if (picks.includes(num)) {
            activeHits.push(num);
            setTempHits([...activeHits]);
          }
        }

        await new Promise(r => setTimeout(r, 250));
        setResult(data);
        onCoinsUpdate(data.coins);
        setRevealing(false);
        setPlaying(false);

        if (data.result === 'win') {
          toast.success(`🎉 MATCHED ${data.details.hits.length} NUMBERS! Won ${data.payout} COINS!`);
        } else {
          toast.error('💔 Better luck next time!');
        }
      } else {
        setResult({ error: data.message });
        toast.error(data.message || 'Game play failed');
        setPlaying(false);
        setRevealing(false);
      }
    } catch (err) {
      setResult({ error: 'Server error' });
      toast.error('Connection error to server');
      setPlaying(false);
      setRevealing(false);
    }
  };

  const win = result?.result === 'win';
  const loss = result?.result === 'loss';
  const currentMultipliers = KENO_MULTIPLIERS[risk][picks.length] || [];

  return (
    <div className="gp-wrap">
      {/* Dynamic Display Cabinet */}
      <div className={`keno-display ${win ? 'keno-win' : loss ? 'keno-loss' : revealing ? 'keno-live' : ''}`}>
        {revealing || (playing && drawnNumbers.length > 0) ? (
          <div className="keno-draw-panel">
            <div className="keno-draw-balls">
              {drawnNumbers.map((num, idx) => {
                const isHit = picks.includes(num);
                return (
                  <div key={idx} className={`draw-ball ${isHit ? 'hit' : 'miss'}`}>
                    {num}
                  </div>
                );
              })}
              {Array.from({ length: 10 - drawnNumbers.length }).map((_, idx) => (
                <div key={idx} className="draw-ball-placeholder">?</div>
              ))}
            </div>
            <div className="keno-live-status">
              🎯 MATCHES: <span className="green-glow">{tempHits.length}</span> / {picks.length}
            </div>
          </div>
        ) : result ? (
          <div className="keno-resolved-panel">
            <div className="keno-verdict-large" style={{ color: win ? '#53fc18' : '#ef4444' }}>
              {win ? `🏆 WINNER!` : `💀 DEFEATED`}
            </div>
            <div className="keno-verdict-desc">
              {win
                ? `Matched ${result.details.hits.length} numbers for a massive ${result.details.multiplier}x multiplier!`
                : `Matched ${result.details.hits.length} numbers. Try again!`
              }
            </div>
            <div className="keno-resolved-payout" style={{ color: win ? '#53fc18' : '#fff' }}>
              {win ? `+${result.payout} COINS` : `−${bet} COINS`}
            </div>
            <button className="gp-adj play-again-btn" onClick={clearPreviousDraw}>DISMISS</button>
          </div>
        ) : (
          <div className="keno-idle-panel">
            <div className="keno-logo-wrap">
              <span className="keno-logo">🎱</span>
            </div>
            <h3>STAKE-STYLE KENO</h3>
            <p>Pick 1 to 10 numbers, choose risk level, and draw to win up to 10,000× your bet!</p>
          </div>
        )}
      </div>

      {/* Play Controls & Layout Grid */}
      <div className="gp-controls">
        <div className="keno-main-layout">
          {/* Numbers Selection Grid (5x8 = 40 numbers) */}
          <div className="keno-grid-section">
            <div className="keno-grid">
              {Array.from({ length: 40 }, (_, i) => i + 1).map((num) => {
                const isPicked = picks.includes(num);
                const isDrawn = drawnNumbers.includes(num);
                const isHit = tempHits.includes(num);
                const isDrawDone = !revealing && playing === false && drawnNumbers.length > 0;

                let cellClass = 'keno-cell';
                if (isHit) {
                  cellClass += ' hit';
                } else if (isPicked && isDrawDone) {
                  cellClass += ' picked-missed';
                } else if (isPicked) {
                  cellClass += ' picked';
                } else if (isDrawn) {
                  cellClass += ' drawn-missed';
                }

                return (
                  <button
                    key={num}
                    className={cellClass}
                    onClick={() => handleCellClick(num)}
                    disabled={playing}
                  >
                    {num}
                  </button>
                );
              })}
            </div>

            {/* Selector helper controls */}
            <div className="keno-helpers">
              <button className="gp-adj" onClick={autoPick} disabled={playing}>
                ⚡ AUTO PICK
              </button>
              <button className="gp-adj" onClick={clearPicks} disabled={playing || picks.length === 0}>
                🗑️ CLEAR
              </button>
            </div>
          </div>

          {/* Configuration sidebar */}
          <div className="keno-config-section">
            {/* Risk Selection */}
            <div className="keno-config-row">
              <label className="gp-label">RISK LEVEL</label>
              <div className="keno-risk-selector">
                {['low', 'classic', 'medium', 'high'].map(r => (
                  <button
                    key={r}
                    className={`risk-btn ${risk === r ? 'active' : ''}`}
                    onClick={() => { if (!playing) { setRisk(r); clearPreviousDraw(); } }}
                    disabled={playing}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Realtime dynamic multiplier view */}
            <div className="keno-multipliers-row">
              <label className="gp-label">
                MULTIPLIERS {picks.length > 0 ? `FOR ${picks.length} PICKS` : ''}
              </label>
              <div className="keno-mult-bar">
                {picks.length === 0 ? (
                  <div className="no-picks-label">Select numbers to view multipliers</div>
                ) : (
                  <div className="mult-pills">
                    {currentMultipliers.map((mult, hitsIdx) => {
                      // Highlight the multiplier pill corresponding to the hits count
                      const isHighlighted = (revealing || drawnNumbers.length > 0) && tempHits.length === hitsIdx;
                      return (
                        <div key={hitsIdx} className={`mult-pill ${isHighlighted ? 'active' : ''} ${mult > 0 ? 'valid' : ''}`}>
                          <span className="pill-hits">{hitsIdx} matches</span>
                          <strong className="pill-val">{mult}×</strong>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Bet configuration row */}
            <div className="gp-bet-row">
              <span className="gp-coin-icon">🪙</span>
              <input
                className="gp-bet-input"
                type="number"
                value={bet}
                min={1}
                disabled={playing}
                onChange={e => { setBet(Math.max(1, +e.target.value)); clearPreviousDraw(); }}
              />
              <button className="gp-adj" onClick={() => { setBet(Math.max(1, Math.floor(bet / 2))); clearPreviousDraw(); }} disabled={playing}>½</button>
              <button className="gp-adj gp-adj-2x" style={{ '--adj-c': '#e91e63' }} onClick={() => { setBet(bet * 2); clearPreviousDraw(); }} disabled={playing}>2×</button>
            </div>

            {/* Main Action Button */}
            <button className="gp-play-btn gp-play-keno" onClick={play} disabled={playing || picks.length === 0}>
              {playing ? '🎱 DRAWING...' : '🎱 PLACE BET'}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        ${sharedStyles}

        .keno-display {
          min-height: 200px;
          background: rgba(0, 0, 0, 0.35);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 30px 24px;
          text-align: center;
          transition: background 0.4s;
          position: relative;
        }

        .keno-win { background: rgba(83, 252, 24, 0.06); }
        .keno-loss { background: rgba(233, 30, 99, 0.04); }
        .keno-live { background: rgba(233, 30, 99, 0.02); }

        .keno-idle-panel { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .keno-logo-wrap {
          font-size: 3.5rem;
          margin-bottom: 8px;
          animation: float 2.5s ease-in-out infinite alternate;
        }
        @keyframes float {
          from { transform: translateY(0px) rotate(0deg); }
          to { transform: translateY(-8px) rotate(5deg); }
        }

        .keno-idle-panel h3 { font-size: 1.5rem; font-weight: 900; letter-spacing: 1px; color: #fff; margin: 0; }
        .keno-idle-panel p { font-size: 0.9rem; color: rgba(255, 255, 255, 0.35); max-width: 360px; line-height: 1.5; margin: 0; }

        .keno-draw-panel { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 20px; }
        .keno-draw-balls { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; max-width: 480px; }

        .draw-ball, .draw-ball-placeholder {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          font-weight: 900;
          font-family: monospace;
          transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .draw-ball.hit {
          background: #53fc18;
          color: #000;
          box-shadow: 0 0 15px #53fc18;
          animation: pop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .draw-ball.miss {
          background: #2a2d34;
          color: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          animation: pop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .draw-ball-placeholder {
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.15);
        }

        .keno-live-status {
          font-size: 0.85rem;
          font-weight: 900;
          letter-spacing: 1px;
          color: rgba(255, 255, 255, 0.4);
        }
        .green-glow { color: #53fc18; text-shadow: 0 0 10px rgba(83, 252, 24, 0.5); }

        .keno-resolved-panel { display: flex; flex-direction: column; align-items: center; gap: 8px; animation: fadeIn 0.3s; }
        .keno-verdict-large { font-size: 2.2rem; font-weight: 900; letter-spacing: 2px; }
        .keno-verdict-desc { font-size: 0.9rem; color: rgba(255, 255, 255, 0.45); font-weight: 600; max-width: 320px; line-height: 1.5; }
        .keno-resolved-payout { font-size: 1.6rem; font-weight: 950; margin: 8px 0; letter-spacing: 1px; }

        .play-again-btn { margin-top: 8px; border-color: rgba(255, 255, 255, 0.15) !important; color: rgba(255, 255, 255, 0.6) !important; }
        .play-again-btn:hover { background: rgba(255, 255, 255, 0.05); color: #fff !important; }

        .keno-main-layout { display: flex; flex-direction: column; gap: 24px; }
        
        .keno-grid-section { display: flex; flex-direction: column; gap: 14px; align-items: center; }
        
        .keno-grid {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 6px;
          width: 100%;
          max-width: 440px;
        }

        .keno-cell {
          aspect-ratio: 1;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.45);
          font-weight: 800;
          font-size: 0.95rem;
          font-family: monospace;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.165, 0.84, 0.44, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        .keno-cell:hover:not(:disabled) {
          border-color: #e91e63;
          color: #fff;
          background: rgba(233, 30, 99, 0.06);
          transform: scale(1.05);
        }

        .keno-cell.picked {
          background: #e91e63;
          border-color: #e91e63;
          color: #fff;
          box-shadow: 0 0 12px rgba(233, 30, 99, 0.4);
        }

        .keno-cell.hit {
          background: #53fc18;
          border-color: #53fc18;
          color: #000;
          box-shadow: 0 0 15px #53fc18;
          transform: scale(1.06);
          animation: pop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .keno-cell.picked-missed {
          background: rgba(233, 30, 99, 0.15);
          border-color: rgba(233, 30, 99, 0.3);
          color: rgba(255, 255, 255, 0.4);
          opacity: 0.5;
        }

        .keno-cell.drawn-missed {
          background: rgba(255, 255, 255, 0.02);
          border-color: rgba(255, 255, 255, 0.25);
          color: #fff;
          animation: pop 0.2s ease-out;
        }

        .keno-helpers { display: flex; gap: 10px; width: 100%; max-width: 440px; justify-content: center; }
        .keno-helpers button { flex: 1; padding: 10px; font-size: 0.75rem; letter-spacing: 1px; }

        .keno-config-section { display: flex; flex-direction: column; gap: 20px; }

        .keno-config-row { display: flex; flex-direction: column; gap: 8px; }
        .keno-risk-selector { display: flex; gap: 6px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 4px; }
        
        .risk-btn {
          flex: 1;
          padding: 10px 4px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.4);
          font-weight: 900;
          font-size: 0.75rem;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .risk-btn:hover:not(:disabled) { color: #fff; }
        .risk-btn.active {
          background: rgba(233, 30, 99, 0.15);
          color: #e91e63;
          border: 1px solid rgba(233, 30, 99, 0.3);
        }
        .risk-btn:disabled { cursor: not-allowed; opacity: 0.6; }

        .keno-multipliers-row { display: flex; flex-direction: column; gap: 8px; }
        .keno-mult-bar {
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 14px;
          padding: 12px;
          min-height: 86px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .no-picks-label {
          color: rgba(255, 255, 255, 0.2);
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-align: center;
        }

        .mult-pills {
          display: flex;
          overflow-x: auto;
          gap: 6px;
          width: 100%;
          padding-bottom: 2px;
          scrollbar-width: thin;
          scrollbar-color: rgba(233, 30, 99, 0.3) transparent;
        }

        .mult-pills::-webkit-scrollbar { height: 4px; }
        .mult-pills::-webkit-scrollbar-thumb { background: rgba(233, 30, 99, 0.3); border-radius: 2px; }

        .mult-pill {
          flex: 0 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 10px;
          padding: 8px 12px;
          min-width: 68px;
          opacity: 0.5;
          transition: all 0.25s;
        }

        .mult-pill.valid { opacity: 0.85; border-color: rgba(255, 255, 255, 0.08); }
        
        .mult-pill.active {
          opacity: 1 !important;
          background: rgba(83, 252, 24, 0.1) !important;
          border-color: #53fc18 !important;
          box-shadow: 0 0 10px rgba(83, 252, 24, 0.2);
          transform: translateY(-2px);
        }

        .pill-hits { font-size: 0.55rem; font-weight: 800; color: rgba(255,255,255,0.4); text-transform: uppercase; margin-bottom: 2px; }
        .pill-val { font-size: 0.85rem; color: #fff; font-weight: 900; }
        .mult-pill.active .pill-hits { color: #53fc18; }

        .gp-play-keno {
          background: linear-gradient(135deg, #e91e63, #ad1457);
          color: #fff;
          font-weight: 950;
          box-shadow: 0 10px 25px rgba(233, 30, 99, 0.25);
        }
        .gp-play-keno:hover:not(:disabled) {
          box-shadow: 0 15px 35px rgba(233, 30, 99, 0.45);
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pop {
          0% { transform: scale(0.85); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }

        @media (min-width: 768px) {
          .keno-main-layout {
            flex-direction: row;
            gap: 30px;
          }
          .keno-grid-section {
            flex: 1.2;
          }
          .keno-config-section {
            flex: 1;
            justify-content: flex-start;
          }
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
`;
