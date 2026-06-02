'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Podium from './Podium';

export default function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [timeLeft, setTimeLeft] = useState({ days: '00', hours: '00', minutes: '00', seconds: '00' });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('monthly');

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const res = await fetch(`${apiUrl}/leaderboard`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const result = await res.json();
      if (result.success) {
        setPlayers(result.data);
        startCountdown(result.endsAt);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      setLoading(false);
    }
  };

  const startCountdown = (endTime) => {
    const targetTime = new Date(endTime).getTime();
    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = targetTime - now;
      if (distance < 0) return;
      setTimeLeft({
        days: String(Math.floor(distance / (1000 * 60 * 60 * 24))).padStart(2, '0'),
        hours: String(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0'),
        minutes: String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0'),
        seconds: String(Math.floor((distance % (1000 * 60)) / 1000)).padStart(2, '0')
      });
    };
    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  };

  const top3 = players.slice(0, 3);
  const remaining = players.slice(3);

  return (
    <section id="leaderboard" className="leaderboard-section">
      <div className="container">
        <header className="leaderboard-header">
          <div className="leaderboard-filters">
            <button className={`filter-btn ${filter === 'weekly' ? 'active' : ''}`} onClick={() => setFilter('weekly')}>WEEKLY</button>
            <button className={`filter-btn ${filter === 'monthly' ? 'active' : ''}`} onClick={() => setFilter('monthly')}>MONTHLY</button>
            <button className={`filter-btn ${filter === 'alltime' ? 'active' : ''}`} onClick={() => setFilter('alltime')}>ALL TIME</button>
          </div>
        </header>

        <Podium top3={top3} />

        <div className="countdown-banner">
          <span className="countdown-label">🏆 LEADERBOARD ENDS IN</span>
          <div className="countdown-segments">
            <div className="countdown-seg">
              <div className="seg-value">{timeLeft.days}</div>
              <div className="seg-unit">DAYS</div>
            </div>
            <div className="countdown-sep">:</div>
            <div className="countdown-seg">
              <div className="seg-value">{timeLeft.hours}</div>
              <div className="seg-unit">HRS</div>
            </div>
            <div className="countdown-sep">:</div>
            <div className="countdown-seg">
              <div className="seg-value">{timeLeft.minutes}</div>
              <div className="seg-unit">MIN</div>
            </div>
            <div className="countdown-sep">:</div>
            <div className="countdown-seg seg-seconds">
              <div className="seg-value">{timeLeft.seconds}</div>
              <div className="seg-unit">SEC</div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .countdown-banner {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 32px;
            margin: 32px 0;
            padding: 24px 40px;
            background: linear-gradient(135deg, rgba(83,252,24,0.05) 0%, rgba(0,242,255,0.05) 100%);
            border: 1px solid rgba(83,252,24,0.15);
            border-radius: 20px;
            flex-wrap: wrap;
          }
          .countdown-label {
            font-size: 0.7rem;
            font-weight: 900;
            letter-spacing: 3px;
            color: rgba(255,255,255,0.5);
          }
          .countdown-segments {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .countdown-seg {
            display: flex;
            flex-direction: column;
            align-items: center;
            background: rgba(0,0,0,0.4);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 14px;
            padding: 16px 20px;
            min-width: 72px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);
          }
          .seg-seconds {
            border-color: rgba(83,252,24,0.3);
            box-shadow: 0 8px 24px rgba(0,0,0,0.3), 0 0 20px rgba(83,252,24,0.1), inset 0 1px 0 rgba(83,252,24,0.1);
          }
          .seg-value {
            font-size: 2.2rem;
            font-weight: 950;
            color: #fff;
            line-height: 1;
            font-variant-numeric: tabular-nums;
            letter-spacing: -1px;
          }
          .seg-seconds .seg-value {
            color: #53fc18;
            text-shadow: 0 0 20px rgba(83,252,24,0.5);
          }
          .seg-unit {
            font-size: 0.55rem;
            font-weight: 900;
            letter-spacing: 2px;
            color: rgba(255,255,255,0.3);
            margin-top: 6px;
          }
          .countdown-sep {
            font-size: 2rem;
            font-weight: 900;
            color: rgba(255,255,255,0.2);
            margin-bottom: 18px;
          }
          @media (max-width: 600px) {
            .countdown-banner { gap: 16px; padding: 18px 16px; }
            .countdown-seg { min-width: 56px; padding: 12px 14px; }
            .seg-value { font-size: 1.6rem; }
          }
        `}</style>

        <div className="leaderboard-list">
          <AnimatePresence>
            {remaining.map((player, index) => (
              <motion.div 
                key={player._id || player.username}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="leaderboard-row"
              >
                <div className="row-rank">{index + 4}</div>
                <div className="row-user">
                  <img src="/lb.png" alt="User" className="row-avatar" />
                  <div className="row-name-group">
                    <div className="row-name">{player.username}</div>
                    <div className="row-badges">{player.badges?.map((b, i) => <span key={i}>{b}</span>)}</div>
                  </div>
                </div>
                <div className="row-xp">
                  <span className="small-label">LEVEL {player.level}</span>
                  <div className="xp-bar-container">
                    <div className="xp-bar-fill" style={{ width: `${(player.xp % 100)}%` }}></div>
                  </div>
                </div>
                <div className="row-wager">
                  <span className="small-label">WAGERED</span>
                  <div>${player.wageredUsd.toLocaleString()}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
