'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import AdminDashboard from './AdminDashboard';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function AdminPortal() {
  const [showLogin, setShowLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Shift + Alt + A
      if (e.shiftKey && e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const savedToken = localStorage.getItem('prism_admin_token');
        if (savedToken) {
          setIsAdmin(true);
        } else {
          setShowLogin(true);
        }
      }
      
      // Escape to close
      if (e.key === 'Escape') {
        setShowLogin(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post(`${API}/admin/login`, { email, password });
      if (res.data.success) {
        localStorage.setItem('prism_admin_token', res.data.token);
        setIsAdmin(true);
        setShowLogin(false);
        toast.success('Admin Session Authorized');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('prism_admin_token');
    setIsAdmin(false);
  };

  if (isAdmin) {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  if (!showLogin) return null;

  return (
    <div className="admin-login-overlay">
      <div className="admin-login-card glass-panel">
        <button className="admin-close-btn" onClick={() => setShowLogin(false)}>&times;</button>
        <div className="admin-login-header">
          <div className="admin-lock-icon">🔒</div>
          <h2>ADMIN ACCESS</h2>
          <p>Please enter your master credentials</p>
        </div>

        <form onSubmit={handleLogin} className="admin-login-form">
          <div className="admin-input-group">
            <label>EMAIL</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="miarush@gmail.com"
              required 
            />
          </div>
          <div className="admin-input-group">
            <label>PASSWORD</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="********"
              required 
            />
          </div>
          
          {error && <div className="admin-error-msg">{error}</div>}
          
          <button type="submit" className="admin-login-btn" disabled={loading}>
            {loading ? 'VERIFYING...' : 'UNLOCK PANEL'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .admin-login-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(10px);
          z-index: 100000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease;
        }

        .admin-login-card {
          width: 100%;
          max-width: 400px;
          padding: 40px;
          position: relative;
          background: rgba(17, 20, 27, 0.8) !important;
          border: 1px solid rgba(0, 242, 255, 0.2) !important;
          box-shadow: 0 0 50px rgba(0, 242, 255, 0.1);
        }

        .admin-close-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 24px;
          cursor: pointer;
        }

        .admin-login-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .admin-lock-icon {
          font-size: 40px;
          margin-bottom: 15px;
        }

        .admin-login-header h2 {
          font-size: 1.5rem;
          font-weight: 900;
          letter-spacing: 2px;
          margin-bottom: 5px;
        }

        .admin-login-header p {
          color: #94a3b8;
          font-size: 0.9rem;
        }

        .admin-input-group {
          margin-bottom: 20px;
        }

        .admin-input-group label {
          display: block;
          font-size: 0.7rem;
          font-weight: 900;
          color: #94a3b8;
          margin-bottom: 8px;
          letter-spacing: 1.5px;
        }

        .admin-input-group input {
          width: 100%;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 12px 15px;
          border-radius: 12px;
          color: #fff;
          font-weight: 600;
          outline: none;
          transition: 0.3s;
        }

        .admin-input-group input:focus {
          border-color: #00f2ff;
          box-shadow: 0 0 15px rgba(0, 242, 255, 0.1);
        }

        .admin-login-btn {
          width: 100%;
          padding: 15px;
          background: #00f2ff;
          color: #000;
          border: none;
          border-radius: 12px;
          font-weight: 900;
          font-size: 1rem;
          cursor: pointer;
          transition: 0.3s;
          letter-spacing: 1px;
        }

        .admin-login-btn:hover:not(:disabled) {
          transform: scale(1.02);
          box-shadow: 0 0 30px rgba(0, 242, 255, 0.4);
        }

        .admin-error-msg {
          color: #ff4444;
          font-size: 0.85rem;
          font-weight: 700;
          margin-bottom: 20px;
          text-align: center;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
