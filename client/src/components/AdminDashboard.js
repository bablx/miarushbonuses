'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-toastify';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const ConfirmDelete = ({ onConfirm, onCancel, type }) => (
  <div className="confirm-toast">
    <div className="confirm-toast-header">
      <span className="warning-icon">⚠️</span>
      <h4>DELETE {type.toUpperCase()}?</h4>
    </div>
    <p>This action is permanent and cannot be undone.</p>
    <div className="confirm-actions">
      <button className="confirm-no" onClick={onCancel}>CANCEL</button>
      <button className="confirm-yes" onClick={onConfirm}>YES, DELETE</button>
    </div>
  </div>
);

export default function AdminDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('raffles');
  const [raffles, setRaffles] = useState([]);
  const [giveaways, setGiveaways] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [modalType, setModalType] = useState('raffle'); // 'raffle' or 'giveaway'
  
  const [newRaffle, setNewRaffle] = useState({
    title: '', prize: '', description: '', requirement: '', status: 'active', maxEntries: 1000
  });

  const [newGiveaway, setNewGiveaway] = useState({
    title: '', prize: '', description: '', code: '', status: 'active'
  });

  const [viewingParticipants, setViewingParticipants] = useState(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('prism_admin_token') : '';

  useEffect(() => {
    fetchAllData();
  }, [activeTab]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'raffles') {
        const res = await axios.get(`${API}/raffles`);
        setRaffles(res.data.data);
      } else if (activeTab === 'giveaways') {
        const res = await axios.get(`${API}/giveaways`);
        setGiveaways(res.data.data);
      } else if (activeTab === 'users') {
        const res = await axios.get(`${API}/admin/users`, { headers: { token } });
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRaffle = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/raffles`, newRaffle, { headers: { token } });
      setIsAdding(false);
      fetchAllData();
      toast.success('Raffle created successfully!');
      setNewRaffle({ title: '', prize: '', description: '', requirement: '', status: 'active', maxEntries: 1000 });
    } catch (err) {
      toast.error('Error creating raffle');
    }
  };

  const handleCreateGiveaway = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/giveaways`, newGiveaway, { headers: { token } });
      setIsAdding(false);
      fetchAllData();
      toast.success('Giveaway created successfully!');
      setNewGiveaway({ title: '', prize: '', description: '', code: '', status: 'active' });
    } catch (err) {
      toast.error('Error creating giveaway');
    }
  };

  const handleDelete = (id, type) => {
    toast(({ closeToast }) => (
      <ConfirmDelete 
        type={type}
        onConfirm={async () => {
          try {
            const endpoint = type === 'raffle' ? 'raffles' : 'giveaways';
            const adminToken = localStorage.getItem('prism_admin_token');
            const res = await axios.delete(`${API}/admin/${endpoint}/${id}`, { 
              headers: { token: adminToken } 
            });
            
            if (res.data.success) {
              toast.dismiss();
              toast.success(`${type.toUpperCase()} DELETED SUCCESSFULLY`);
              fetchAllData();
            }
          } catch (err) {
            toast.error(`Failed to delete ${type}`);
          }
        }}
        onCancel={closeToast}
      />
    ), { 
      autoClose: false, 
      closeOnClick: false,
      position: "top-center"
    });
  };

  return (
    <div className="admin-dashboard-overlay">
      <div className="admin-dashboard-container glass-panel">
        <aside className="admin-sidebar">
          <div className="admin-logo">
            <img src="/mia.png" alt="Admin" />
            <span>ADMIN PANEL</span>
          </div>
          <nav className="admin-nav">
            <button className={`admin-nav-item ${activeTab === 'raffles' ? 'active' : ''}`} onClick={() => setActiveTab('raffles')}>
              🎟️ RAFFLES
            </button>
            <button className={`admin-nav-item ${activeTab === 'giveaways' ? 'active' : ''}`} onClick={() => setActiveTab('giveaways')}>
              🎁 GIVEAWAYS
            </button>
            <button className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
              👥 USERS
            </button>
          </nav>
          <button className="admin-logout-btn" onClick={onLogout}>LOGOUT</button>
        </aside>

        <main className="admin-main">
          <header className="admin-header">
            <h1>{activeTab.toUpperCase()}</h1>
            {activeTab === 'raffles' && <button className="admin-add-btn" onClick={() => { setModalType('raffle'); setIsAdding(true); }}>+ NEW RAFFLE</button>}
            {activeTab === 'giveaways' && <button className="admin-add-btn" onClick={() => { setModalType('giveaway'); setIsAdding(true); }}>+ NEW GIVEAWAY</button>}
          </header>

          <div className="admin-content">
            {loading ? (
              <div className="admin-loader">LOADING DATA...</div>
            ) : (
              <>
                {activeTab === 'raffles' && (
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr><th>TITLE</th><th>PRIZE</th><th>STATUS</th><th>ENTRIES</th><th>PARTICIPANTS</th><th>ACTIONS</th></tr>
                      </thead>
                      <tbody>
                        {raffles.map(r => (
                          <tr key={r._id}>
                            <td>{r.title}</td><td>{r.prize}</td>
                            <td><span className={`status-pill ${r.status}`}>{r.status}</span></td>
                            <td>{r.entries}/{r.maxEntries}</td>
                            <td>
                              <div className="participants-preview">
                                {r.participants && r.participants.length > 0 ? (
                                  <button 
                                    className="view-list-btn" 
                                    onClick={() => setViewingParticipants({ ...r, type: 'Raffle' })}
                                  >
                                    👤 {r.participants.length} VIEW LIST
                                  </button>
                                ) : 'None'}
                              </div>
                            </td>
                            <td><button className="action-btn delete" onClick={() => handleDelete(r._id, 'raffle')}>🗑️</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'giveaways' && (
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr><th>TITLE</th><th>PRIZE</th><th>CODE</th><th>STATUS</th><th>ENTRIES</th><th>ACTIONS</th></tr>
                      </thead>
                      <tbody>
                        {giveaways.map(g => (
                          <tr key={g._id}>
                            <td>{g.title}</td><td>{g.prize}</td><td><code>{g.code || 'N/A'}</code></td>
                            <td><span className={`status-pill ${g.status}`}>{g.status}</span></td>
                            <td>
                              <div className="participants-preview">
                                {g.participants && g.participants.length > 0 ? (
                                  <button 
                                    className="view-list-btn" 
                                    onClick={() => setViewingParticipants({ ...g, type: 'Giveaway' })}
                                  >
                                    👤 {g.participants.length} VIEW LIST
                                  </button>
                                ) : 'None'}
                              </div>
                            </td>
                            <td><button className="action-btn delete" onClick={() => handleDelete(g._id, 'giveaway')}>🗑️</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'users' && (
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr><th>USER</th><th>COINS</th><th>REGISTERED</th></tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u._id}>
                            <td className="user-td">
                              <img src={u.avatar} alt={u.username} className="small-avatar" />
                              <span>{u.username}</span>
                            </td>
                            <td>🪙 {u.coins.toLocaleString()}</td>
                            <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : (u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'N/A')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="admin-modal-overlay">
            <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="admin-modal glass-panel">
              <h3>CREATE NEW {modalType.toUpperCase()}</h3>
              <form onSubmit={modalType === 'raffle' ? handleCreateRaffle : handleCreateGiveaway} className="admin-form">
                <input placeholder="Title" required value={modalType === 'raffle' ? newRaffle.title : newGiveaway.title} onChange={(e) => modalType === 'raffle' ? setNewRaffle({...newRaffle, title: e.target.value}) : setNewGiveaway({...newGiveaway, title: e.target.value})} />
                <input placeholder="Prize" required value={modalType === 'raffle' ? newRaffle.prize : newGiveaway.prize} onChange={(e) => modalType === 'raffle' ? setNewRaffle({...newRaffle, prize: e.target.value}) : setNewGiveaway({...newGiveaway, prize: e.target.value})} />
                <textarea placeholder="Description" value={modalType === 'raffle' ? newRaffle.description : newGiveaway.description} onChange={(e) => modalType === 'raffle' ? setNewRaffle({...newRaffle, description: e.target.value}) : setNewGiveaway({...newGiveaway, description: e.target.value})} />
                
                {modalType === 'raffle' ? (
                  <>
                    <input placeholder="Requirement" value={newRaffle.requirement} onChange={(e) => setNewRaffle({...newRaffle, requirement: e.target.value})} />
                    <div className="form-row">
                      <select value={newRaffle.status} onChange={(e) => setNewRaffle({...newRaffle, status: e.target.value})}>
                        <option value="active">Active</option><option value="upcoming">Upcoming</option><option value="ended">Ended</option>
                      </select>
                      <input type="number" placeholder="Max Entries" value={newRaffle.maxEntries} onChange={(e) => setNewRaffle({...newRaffle, maxEntries: parseInt(e.target.value)})} />
                    </div>
                  </>
                ) : (
                  <>
                    <input placeholder="Redeem Code (Optional)" value={newGiveaway.code} onChange={(e) => setNewGiveaway({...newGiveaway, code: e.target.value})} />
                    <select value={newGiveaway.status} onChange={(e) => setNewGiveaway({...newGiveaway, status: e.target.value})}>
                      <option value="active">Active</option><option value="ended">Ended</option>
                    </select>
                  </>
                )}

                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setIsAdding(false)}>CANCEL</button>
                  <button type="submit" className="confirm-btn">CREATE</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingParticipants && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="admin-modal-overlay">
            <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="admin-modal glass-panel p-list-modal">
              <header className="p-list-header">
                <h3>{viewingParticipants.type.toUpperCase()} PARTICIPANTS</h3>
                <span className="p-count-badge">{viewingParticipants.participants.length} USERS</span>
              </header>
              
              <div className="p-list-content">
                <table className="p-list-table">
                  <thead>
                    <tr><th>#</th><th>USERNAME / ID</th></tr>
                  </thead>
                  <tbody>
                    {viewingParticipants.participants.map((p, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td className="p-id-cell">
                          <span className="p-id-tag">USER</span>
                          <code>{p}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="modal-actions">
                <button className="confirm-btn" style={{ width: '100%' }} onClick={() => setViewingParticipants(null)}>CLOSE LIST</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .admin-dashboard-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #080a0f; z-index: 99999; display: flex; padding: 20px; }
        .admin-dashboard-container { width: 100%; display: flex; overflow: hidden; background: rgba(17, 20, 27, 0.95) !important; border: 1px solid rgba(255, 255, 255, 0.05) !important; }
        .admin-sidebar { width: 280px; border-right: 1px solid rgba(255, 255, 255, 0.05); display: flex; flex-direction: column; padding: 30px; }
        .admin-logo { display: flex; align-items: center; gap: 15px; margin-bottom: 50px; }
        .admin-logo img { height: 40px; }
        .admin-logo span { font-weight: 900; letter-spacing: 2px; font-size: 0.9rem; color: #00f2ff; }
        .admin-nav { display: flex; flex-direction: column; gap: 10px; flex: 1; }
        .admin-nav-item { text-align: left; background: transparent; border: none; color: #94a3b8; padding: 15px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.3s; letter-spacing: 1px; }
        .admin-nav-item:hover, .admin-nav-item.active { background: rgba(0, 242, 255, 0.1); color: #00f2ff; }
        .admin-logout-btn { margin-top: auto; background: rgba(255, 0, 0, 0.1); color: #ff4444; border: 1px solid rgba(255, 0, 0, 0.2); padding: 12px; border-radius: 12px; font-weight: 800; cursor: pointer; transition: 0.3s; }
        .admin-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .admin-header { padding: 30px 40px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        .admin-header h1 { font-size: 1.5rem; font-weight: 900; letter-spacing: 2px; }
        .admin-add-btn { background: #00f2ff; color: #000; border: none; padding: 10px 25px; border-radius: 10px; font-weight: 900; cursor: pointer; transition: 0.3s; }
        .admin-content { flex: 1; padding: 40px; overflow-y: auto; }
        .admin-loader { text-align: center; padding: 100px 0; color: #00f2ff; font-weight: 900; letter-spacing: 3px; }
        .admin-table-wrapper { background: rgba(0, 0, 0, 0.3); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.05); overflow: hidden; }
        .admin-table { width: 100%; border-collapse: collapse; text-align: left; }
        .admin-table th { padding: 20px; font-size: 0.75rem; color: #94a3b8; font-weight: 900; letter-spacing: 1px; background: rgba(255, 255, 255, 0.02); }
        .admin-table td { padding: 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.03); font-weight: 600; }
        .user-td { display: flex; align-items: center; gap: 12px; }
        .small-avatar { width: 30px; height: 30px; border-radius: 50%; border: 1px solid #00f2ff; }
        .status-pill { padding: 4px 12px; border-radius: 8px; font-size: 0.7rem; font-weight: 900; text-transform: uppercase; }
        .status-pill.active { background: rgba(83, 252, 24, 0.1); color: #53fc18; }
        .status-pill.upcoming { background: rgba(0, 242, 255, 0.1); color: #00f2ff; }
        .status-pill.ended { background: rgba(255, 0, 0, 0.1); color: #ff4444; }
        .action-btn { background: transparent; border: none; font-size: 1.2rem; cursor: pointer; opacity: 0.6; transition: 0.3s; }
        .action-btn:hover { opacity: 1; transform: scale(1.1); }
        .admin-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); z-index: 1000000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .admin-modal { width: 100%; max-width: 500px; padding: 40px; background: #11141b !important; border-color: #00f2ff !important; }
        .admin-modal h3 { font-size: 1.5rem; font-weight: 900; margin-bottom: 30px; text-align: center; }
        .admin-form { display: flex; flex-direction: column; gap: 20px; }
        .admin-form input, .admin-form textarea, .admin-form select { background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 12px; color: #fff; font-weight: 600; outline: none; }
        .admin-form textarea { height: 100px; resize: none; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .modal-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
        .confirm-btn { background: #00f2ff; color: #000; border: none; padding: 15px; border-radius: 12px; font-weight: 900; cursor: pointer; }
        .cancel-btn { background: rgba(255, 255, 255, 0.05); color: #fff; border: 1px solid rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 12px; font-weight: 900; cursor: pointer; }
        
        .p-badge { background: rgba(0, 242, 255, 0.1); color: #00f2ff; padding: 5px 10px; border-radius: 8px; font-size: 0.7rem; font-weight: 800; cursor: help; border: 1px solid rgba(0, 242, 255, 0.2); }
        .participants-preview { display: flex; align-items: center; }

        .view-list-btn { background: rgba(0, 242, 255, 0.1); color: #00f2ff; padding: 6px 12px; border-radius: 8px; font-size: 0.7rem; font-weight: 800; cursor: pointer; border: 1px solid rgba(0, 242, 255, 0.2); transition: 0.3s; }
        .view-list-btn:hover { background: #00f2ff; color: #000; }

        .p-list-modal { max-width: 600px !important; }
        .p-list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .p-count-badge { background: #53fc18; color: #000; padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 900; }
        .p-list-content { max-height: 400px; overflow-y: auto; margin-bottom: 20px; border-radius: 12px; background: rgba(0,0,0,0.2); }
        .p-list-table { width: 100%; border-collapse: collapse; }
        .p-list-table th { padding: 12px 20px; text-align: left; font-size: 0.7rem; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .p-list-table td { padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.02); font-size: 0.9rem; }
        .p-id-cell { display: flex; align-items: center; gap: 15px; }
        .p-id-tag { background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 4px; font-size: 0.6rem; font-weight: 900; color: #94a3b8; }
        .p-id-cell code { color: #00f2ff; font-family: monospace; font-weight: 700; }

        .confirm-toast { display: flex; flex-direction: column; gap: 10px; padding: 5px 0; }
        .confirm-toast-header { display: flex; align-items: center; gap: 10px; }
        .warning-icon { font-size: 1.2rem; filter: drop-shadow(0 0 5px rgba(255, 68, 68, 0.5)); }
        .confirm-toast h4 { font-size: 1.1rem; font-weight: 900; color: #ff4444; margin: 0; letter-spacing: 1px; }
        .confirm-toast p { font-size: 0.85rem; font-weight: 600; color: #94a3b8; margin: 0 0 15px 0; line-height: 1.4; }
        .confirm-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 5px; }
        .confirm-yes { background: linear-gradient(135deg, rgba(255, 68, 68, 0.8), rgba(204, 0, 0, 0.8)); color: #fff; border: 1px solid rgba(255, 100, 100, 0.4); padding: 10px; border-radius: 8px; font-weight: 900; font-size: 0.75rem; letter-spacing: 1px; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(255, 68, 68, 0.2); text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
        .confirm-no { background: rgba(255, 255, 255, 0.03); color: #94a3b8; border: 1px solid rgba(255, 255, 255, 0.1); padding: 10px; border-radius: 8px; font-weight: 800; font-size: 0.75rem; letter-spacing: 1px; cursor: pointer; transition: all 0.3s ease; backdrop-filter: blur(5px); }
        
        .confirm-yes:hover { background: linear-gradient(135deg, #ff4444, #cc0000); box-shadow: 0 6px 20px rgba(255, 68, 68, 0.5); transform: translateY(-2px); border-color: #ff6666; }
        .confirm-no:hover { background: rgba(255, 255, 255, 0.08); color: #fff; border-color: rgba(255, 255, 255, 0.25); transform: translateY(-2px); }
        
        .confirm-yes:active, .confirm-no:active { transform: translateY(1px); box-shadow: none; }

        @media (max-width: 1024px) {
          .admin-sidebar { width: 220px; padding: 20px; }
          .admin-header { padding: 20px; }
          .admin-content { padding: 20px; }
        }

        @media (max-width: 768px) {
          .admin-dashboard-container { flex-direction: column; overflow-y: auto; }
          .admin-sidebar { width: 100%; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.05); padding: 15px; height: auto; }
          .admin-logo { margin-bottom: 20px; justify-content: center; }
          .admin-nav { flex-direction: row; flex-wrap: wrap; justify-content: center; gap: 5px; }
          .admin-nav-item { padding: 10px 15px; font-size: 0.8rem; }
          .admin-logout-btn { margin-top: 15px; }
          .admin-main { overflow-y: visible; }
          .admin-table-wrapper { overflow-x: auto; border-radius: 10px; }
          .admin-header { flex-direction: column; gap: 15px; text-align: center; }
          .admin-modal { padding: 25px; margin: 10px; }
          .form-row { grid-template-columns: 1fr; }
        }

        @media (max-width: 480px) {
          .admin-table th, .admin-table td { padding: 10px; font-size: 0.75rem; }
          .action-btn { font-size: 1rem; }
          .p-badge, .view-list-btn { padding: 4px 8px; font-size: 0.65rem; }
          .admin-modal h3 { font-size: 1.2rem; }
          .modal-actions { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
