'use client';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function ChickenGame({ user, onCoinsUpdate }) {
  const [betAmount, setBetAmount] = useState(10);
  const [boneCount, setBoneCount] = useState(1);
  const [gameState, setGameState] = useState('idle'); // idle, playing, ended
  const [grid, setGrid] = useState(new Array(25).fill(null));
  const [revealedIndices, setRevealedIndices] = useState([]);
  const [multiplier, setMultiplier] = useState(1);
  const [nextMultiplier, setNextMultiplier] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fullGrid, setFullGrid] = useState(null);

  // Initial multiplier calculation for "Next Tile"
  useEffect(() => {
    if (gameState === 'idle') {
      const m = calculateInitialNextMultiplier(25, boneCount, 1);
      setNextMultiplier(m);
    }
  }, [boneCount, gameState]);

  function calculateInitialNextMultiplier(total, bones, revealed) {
    let prob = 1;
    for (let i = 0; i < revealed; i++) {
      prob *= (total - bones - i) / (total - i);
    }
    return (0.97 / prob).toFixed(2);
  }

  const startGame = async () => {
    if (!user) {
      toast.error('Please login to play');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/games/chicken/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, betAmount, boneCount })
      });
      const data = await res.json();
      if (data.success) {
        setGameState('playing');
        setGrid(new Array(25).fill(null));
        setRevealedIndices([]);
        setMultiplier(1);
        setFullGrid(null);
        onCoinsUpdate(data.coins);
      } else {
        toast.error(data.message);
      }
    } catch (e) {
      console.error('Chicken Start Error:', e);
      toast.error('Failed to start game: ' + e.message);
    }
    setLoading(false);
  };

  const revealTile = async (index) => {
    if (gameState !== 'playing' || loading || revealedIndices.includes(index)) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/games/chicken/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, index })
      });
      const data = await res.json();
      if (data.success) {
        if (data.status === 'ended') {
          setGameState('ended');
          setFullGrid(data.grid);
          toast.error('BOOM! Hitted a bone.');
        } else {
          const newRevealed = [...revealedIndices, index];
          setRevealedIndices(newRevealed);
          const newGrid = [...grid];
          newGrid[index] = 'chicken';
          setGrid(newGrid);
          setMultiplier(data.multiplier);
          setNextMultiplier(data.nextMultiplier);
        }
      }
    } catch (e) {
      toast.error('Error revealing tile');
    }
    setLoading(false);
  };

  const cashout = async () => {
    if (gameState !== 'playing' || loading || revealedIndices.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/games/chicken/cashout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username })
      });
      const data = await res.json();
      if (data.success) {
        setGameState('ended');
        setFullGrid(data.grid);
        onCoinsUpdate(data.coins);
        toast.success(`Cashed out ${data.payout} coins! 🎉`);
      }
    } catch (e) {
      toast.error('Cashout failed');
    }
    setLoading(false);
  };

  return (
    <div className="chicken-container">
      <div className="chicken-sidebar">
        <div className="control-group">
          <label>BET AMOUNT</label>
          <div className="input-wrap">
            <input 
              type="number" 
              value={betAmount} 
              onChange={(e) => setBetAmount(Math.max(1, parseInt(e.target.value) || 0))}
              disabled={gameState === 'playing'}
            />
            <span className="coin-tag">🪙</span>
          </div>
          <div className="quick-bets">
            <button onClick={() => setBetAmount(Math.floor(betAmount / 2))} disabled={gameState === 'playing'}>1/2</button>
            <button onClick={() => setBetAmount(betAmount * 2)} disabled={gameState === 'playing'}>2x</button>
          </div>
        </div>

        <div className="control-group">
          <label>BONES</label>
          <select 
            value={boneCount} 
            onChange={(e) => setBoneCount(parseInt(e.target.value))}
            disabled={gameState === 'playing'}
          >
            {[...Array(24)].map((_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}</option>
            ))}
          </select>
        </div>

        {gameState === 'playing' ? (
          <button className="cashout-btn" onClick={cashout} disabled={loading || revealedIndices.length === 0}>
            <span className="cashout-label">CASHOUT</span>
            <span className="cashout-val">{(betAmount * multiplier).toFixed(2)} 🪙</span>
          </button>
        ) : (
          <button className="play-btn" onClick={startGame} disabled={loading}>
            {loading ? 'STARTING...' : 'PLAY'}
          </button>
        )}

        {gameState === 'playing' && (
          <div className="game-stats-mini">
            <div className="mini-stat">
              <label>MULTIPLIER</label>
              <div className="val">{multiplier}x</div>
            </div>
            <div className="mini-stat">
              <label>NEXT TILE</label>
              <div className="val">{nextMultiplier}x</div>
            </div>
          </div>
        )}
      </div>

      <div className="chicken-main">
        <div className="chicken-grid-5x5">
          {grid.map((tile, i) => {
            const isRevealed = revealedIndices.includes(i);
            const content = fullGrid ? fullGrid[i] : tile;
            const isEnd = gameState === 'ended';
            
            return (
              <button 
                key={i}
                className={`tile ${isRevealed ? 'revealed' : ''} ${isEnd ? 'game-over' : ''} ${isEnd && fullGrid[i] === 'bone' && !isRevealed ? 'missed-bone' : ''}`}
                onClick={() => revealTile(i)}
                disabled={gameState !== 'playing' || isRevealed || loading}
              >
                <div className="tile-inner">
                  {!isRevealed && !isEnd && <span className="dish-emoji">🍽️</span>}
                  {(isRevealed || isEnd) && (
                    <span className={`reveal-emoji ${content}`}>
                      {content === 'chicken' ? '🍗' : '🦴'}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .chicken-container {
          display: flex;
          background: #0d1017;
          border-radius: 20px;
          overflow: hidden;
          min-height: 500px;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .chicken-sidebar {
          width: 300px;
          background: #11141b;
          padding: 30px;
          display: flex;
          flex-direction: column;
          gap: 25px;
          border-right: 1px solid rgba(255,255,255,0.05);
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .control-group label {
          font-size: 0.7rem;
          font-weight: 900;
          color: rgba(255,255,255,0.3);
          letter-spacing: 1.5px;
        }

        .input-wrap {
          position: relative;
          background: #080a0f;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          display: flex;
          align-items: center;
          padding: 2px 12px;
        }

        .input-wrap input {
          background: transparent;
          border: none;
          color: #fff;
          padding: 12px 0;
          width: 100%;
          font-weight: 800;
          font-size: 1rem;
          outline: none;
        }

        .coin-tag { font-size: 1.2rem; }

        .quick-bets {
          display: flex;
          gap: 8px;
        }

        .quick-bets button {
          flex: 1;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.6);
          padding: 8px;
          border-radius: 8px;
          font-weight: 800;
          font-size: 0.8rem;
          cursor: pointer;
          transition: 0.2s;
        }

        .quick-bets button:hover:not(:disabled) { background: rgba(255,255,255,0.1); color: #fff; }

        select {
          background: #080a0f;
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          padding: 12px;
          border-radius: 12px;
          font-weight: 800;
          outline: none;
        }

        .play-btn {
          background: #53fc18;
          color: #000;
          border: none;
          padding: 18px;
          border-radius: 14px;
          font-weight: 950;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 10px 25px rgba(83, 252, 24, 0.2);
        }

        .play-btn:hover:not(:disabled) { transform: scale(1.02); box-shadow: 0 15px 35px rgba(83, 252, 24, 0.4); }
        .play-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .cashout-btn {
          background: linear-gradient(135deg, #f59e0b, #ef4444);
          color: #fff;
          border: none;
          padding: 18px;
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          transition: 0.3s;
          box-shadow: 0 10px 25px rgba(245, 158, 11, 0.2);
        }

        .cashout-btn:hover:not(:disabled) { transform: scale(1.02); box-shadow: 0 15px 35px rgba(245, 158, 11, 0.4); }
        .cashout-label { font-size: 0.7rem; font-weight: 900; opacity: 0.8; }
        .cashout-val { font-size: 1.2rem; font-weight: 950; }

        .game-stats-mini {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-top: auto;
          background: rgba(0,0,0,0.2);
          padding: 15px;
          border-radius: 12px;
        }

        .mini-stat label { font-size: 0.55rem; display: block; margin-bottom: 4px; }
        .mini-stat .val { font-size: 1.1rem; font-weight: 950; color: #53fc18; }

        .chicken-main {
          flex: 1;
          padding: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #080a0f;
        }

        .chicken-grid-5x5 {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
          width: 100%;
          max-width: 500px;
          aspect-ratio: 1/1;
        }

        .tile {
          aspect-ratio: 1;
          background: #11141b;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }

        .tile:hover:not(:disabled) {
          transform: translateY(-5px);
          background: #1c232e;
          border-color: rgba(255,255,255,0.1);
        }

        .tile.revealed { background: #1c232e; cursor: default; }
        .tile.revealed .reveal-emoji.chicken { color: #53fc18; filter: drop-shadow(0 0 10px rgba(83, 252, 24, 0.5)); }
        
        .tile.game-over { cursor: default; opacity: 0.6; }
        .tile.game-over.revealed { opacity: 1; transform: scale(1.1); z-index: 2; border-color: #ef4444; }
        
        .missed-bone { border-color: rgba(239, 68, 68, 0.3) !important; opacity: 0.4 !important; }

        .dish-emoji { font-size: 2.2rem; filter: grayscale(0.5); opacity: 0.7; }
        .reveal-emoji { font-size: 2.5rem; display: block; animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }

        @keyframes popIn {
          0% { transform: scale(0) rotate(-45deg); opacity: 0; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }

        @media (max-width: 768px) {
          .chicken-container { flex-direction: column-reverse; }
          .chicken-sidebar { width: 100%; border-right: none; border-top: 1px solid rgba(255,255,255,0.05); }
          .chicken-main { padding: 20px; }
          .chicken-grid-5x5 { gap: 8px; }
          .dish-emoji { font-size: 1.5rem; }
          .reveal-emoji { font-size: 1.8rem; }
        }
      `}</style>
    </div>
  );
}
