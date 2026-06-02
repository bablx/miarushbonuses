'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Navbar({ user, onLogout, onLoginClick, coins }) {
  const [isActive, setIsActive] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setIsActive(!isActive);

  const handleLogout = () => {
    setIsActive(false);
    if (onLogout) onLogout();
  };

  return (
    <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <nav className="nav-container container">
        <div className="nav-brand">
          <Link href="/">
            <img src="/mia.png" alt="MIARUSH" className="nav-logo-float" />
          </Link>
        </div>
        
        <ul className={`nav-menu ${isActive ? 'active' : ''}`}>
          <li><Link href="/" className="nav-link" onClick={() => setIsActive(false)}>HOME</Link></li>
          <li><Link href="/bonuses" className="nav-link" onClick={() => setIsActive(false)}>BONUSES</Link></li>
          <li><Link href="/raffles" className="nav-link" onClick={() => setIsActive(false)}>RAFFLES</Link></li>
          <li><Link href="/games" className="nav-link" onClick={() => setIsActive(false)}>GAMES</Link></li>
          <li><Link href="/rankings" className="nav-link" onClick={() => setIsActive(false)}>RANKINGS</Link></li>
          <li><Link href="/faq" className="nav-link" onClick={() => setIsActive(false)}>FAQ</Link></li>

          {user ? (
            <li className="mobile-only mobile-user-section">
              <div className="mobile-user-info">
                <img src={user.avatar} alt={user.username} className="nav-avatar" />
                <span className="nav-username">{user.username}</span>
                <span className="mobile-coins">🪙 {(coins || 0).toLocaleString()}</span>
              </div>
              <button className="login-btn-mobile logout" onClick={handleLogout}>
                LOGOUT
              </button>
            </li>
          ) : (
            <li className="mobile-only">
              <button className="login-btn-mobile" onClick={() => { onLoginClick(); setIsActive(false); }}>
                LOGIN WITH KICK
              </button>
            </li>
          )}
        </ul>

        <div className="nav-actions desktop-only">
          {user ? (
            <div className="user-profile-nav">
              <div className="user-info">
                <img src={user.avatar} alt={user.username} className="nav-avatar" />
                <span className="nav-username">{user.username}</span>
              </div>
              <div className="nav-coins">🪙 {(coins || 0).toLocaleString()}</div>
              <button className="nav-logout-btn" style={{ background: '#ff4444', color: '#fff' }} onClick={handleLogout}>LOGOUT</button>
            </div>
          ) : (
            <button className="nav-login-btn" onClick={onLoginClick}>LOGIN WITH KICK</button>
          )}
        </div>

        <div className={`nav-toggle ${isActive ? 'active' : ''}`} onClick={toggleMenu}>
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>
      </nav>
    </header>
  );
}
