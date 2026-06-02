const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const mongoose = require('mongoose');
puppeteer.use(StealthPlugin());
require('dotenv').config();

const User = require('./models/User');
const Player = require('./models/Player');
const Activity = require('./models/Activity');
const GameHistory = require('./models/GameHistory');
const Raffle = require('./models/Raffle');
const Giveaway = require('./models/Giveaway');
const GameSession = require('./models/GameSession');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/miarush';

// VERSION CHECK - If you see this in logs, latest code is deployed
console.log('🚀 SERVER VERSION: CORS-FIX-V4 - origin:true');

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');
    seedDatabase();
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    if (err.message.includes('ECONNREFUSED')) {
      console.log('💡 TIP: This is a DNS issue. Try changing your DNS to 8.8.8.8 or check your internet connection.');
    }
    setTimeout(connectDB, 5000);
  }
};
connectDB();

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.CLIENT_URL,
  'https://miarushbonuses.com',
  'https://www.miarushbonuses.com'
].filter(Boolean).map(url => url.replace(/\/$/, "")); // Remove trailing slashes

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Health check to verify server is alive
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

class PuppeteerQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  async add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.next();
    });
  }

  async next() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    const { task, resolve, reject } = this.queue.shift();
    
    try {
      const result = await Promise.race([
        task(),
        new Promise((_, j) => setTimeout(() => j(new Error('Task timeout (90s)')), 90000))
      ]);
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      this.processing = false;
      this.next();
    }
  }
}

const pQueue = new PuppeteerQueue();

const verificationCodes = new Map();
const streamInfoCache = new Map();
const activeFetches = new Set();
const CACHE_DURATION = 15 * 60 * 1000;

app.get('/api/leaderboard', async (req, res) => {
  try {
    const players = await Player.find().sort({ rank: 1 });
    res.json({
      success: true,
      data: players,
      endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching leaderboard" });
  }
});

app.get('/api/activity', async (req, res) => {
  try {
    const activities = await Activity.find({ action: { $not: /logged in/i } })
      .sort({ timestamp: -1 })
      .limit(10);
      
    const getTimeAgo = (date) => {
      const seconds = Math.floor((new Date() - new Date(date)) / 1000);
      if (seconds < 60) return 'Just now';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      return `${Math.floor(hours / 24)}d ago`;
    };

    const formatted = activities.map(a => ({
      id: a._id,
      user: a.user,
      action: a.action,
      time: getTimeAgo(a.timestamp)
    }));
    
    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching activity" });
  }
});

// --- ADMIN & RAFFLE ROUTES ---

app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true, token: 'prism-admin-v1' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.get('/api/raffles', async (req, res) => {
  try {
    const raffles = await Raffle.find().sort({ createdAt: -1 });
    res.json({ success: true, data: raffles });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching raffles" });
  }
});

app.post('/api/admin/raffles', async (req, res) => {
  const { token } = req.headers;
  if (token !== 'prism-admin-v1') return res.status(403).json({ success: false });

  try {
    const raffle = new Raffle(req.body);
    await raffle.save();
    res.json({ success: true, data: raffle });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error creating raffle" });
  }
});

app.put('/api/admin/raffles/:id', async (req, res) => {
  const { token } = req.headers;
  if (token !== 'prism-admin-v1') return res.status(403).json({ success: false });

  try {
    const raffle = await Raffle.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: raffle });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating raffle" });
  }
});

app.delete('/api/admin/raffles/:id', async (req, res) => {
  const { token } = req.headers;
  if (token !== 'prism-admin-v1') return res.status(403).json({ success: false });

  try {
    await Raffle.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error deleting raffle" });
  }
});

app.get('/api/giveaways', async (req, res) => {
  try {
    const giveaways = await Giveaway.find().sort({ createdAt: -1 });
    res.json({ success: true, data: giveaways });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching giveaways" });
  }
});

app.post('/api/admin/giveaways', async (req, res) => {
  const { token } = req.headers;
  if (token !== 'prism-admin-v1') return res.status(403).json({ success: false });

  try {
    const giveaway = new Giveaway(req.body);
    await giveaway.save();
    res.json({ success: true, data: giveaway });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error creating giveaway" });
  }
});

app.put('/api/admin/giveaways/:id', async (req, res) => {
  const { token } = req.headers;
  if (token !== 'prism-admin-v1') return res.status(403).json({ success: false });

  try {
    const giveaway = await Giveaway.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: giveaway });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating giveaway" });
  }
});

app.delete('/api/admin/giveaways/:id', async (req, res) => {
  const { token } = req.headers;
  if (token !== 'prism-admin-v1') return res.status(403).json({ success: false });

  try {
    await Giveaway.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error deleting giveaway" });
  }
});

app.get('/api/admin/users', async (req, res) => {
  const { token } = req.headers;
  if (token !== 'prism-admin-v1') return res.status(403).json({ success: false });

  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching users" });
  }
});

app.post('/api/raffles/:id/enter', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ success: false, message: "Username required" });

  try {
    const raffle = await Raffle.findById(req.params.id);
    if (!raffle) return res.status(404).json({ success: false, message: "Raffle not found" });
    if (raffle.status !== 'active') return res.status(400).json({ success: false, message: "Raffle is not active" });

    if (raffle.participants.includes(username)) {
      return res.status(400).json({ success: false, message: "You are already registered!" });
    }

    if (raffle.entries >= raffle.maxEntries) {
      return res.status(400).json({ success: false, message: "Raffle is full!" });
    }

    raffle.participants.push(username);
    raffle.entries = raffle.participants.length;
    await raffle.save();

    res.json({ success: true, message: "Successfully registered for raffle!" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error entering raffle" });
  }
});

app.post('/api/giveaways/:id/enter', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ success: false, message: "Username required" });

  try {
    const giveaway = await Giveaway.findById(req.params.id);
    if (!giveaway) return res.status(404).json({ success: false, message: "Giveaway not found" });
    if (giveaway.status !== 'active') return res.status(400).json({ success: false, message: "Giveaway is not active" });

    if (giveaway.participants.includes(username)) {
      return res.status(400).json({ success: false, message: "You have already claimed this giveaway!" });
    }

    giveaway.participants.push(username);
    await giveaway.save();

    res.json({ success: true, message: "Giveaway successfully claimed!" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error entering giveaway" });
  }
});

app.post('/api/auth/start', async (req, res) => {
  const { username } = req.body;
  if (!username || username.length < 3) {
    return res.status(400).json({ success: false, message: "Invalid username (min 3 chars)" });
  }
  const reserved = ['admin', 'test', 'root', 'invalid'];
  if (reserved.includes(username.toLowerCase())) {
    return res.status(400).json({ success: false, message: "This username is reserved." });
  }
  const code = `PRIS-${Math.floor(1000 + Math.random() * 9000)}`;
  verificationCodes.set(username.toLowerCase(), code);
  res.json({ success: true, code });
});

const fetchStreamInfoLightweight = async (username) => {
  const apis = [
    `https://kick.com/api/v2/channels/${username}`,
    `https://kick.com/api/v1/channels/${username}`,
  ];

  for (const apiUrl of apis) {
    try {
      const response = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://kick.com/',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 10000
      });

      const d = response.data?.data || response.data;
      return {
        followers: d?.followers_count || d?.followersCount || d?.followers || 0,
        isLive: !!(d?.livestream && d?.livestream?.is_live !== false),
        category: d?.livestream?.categories?.[0]?.name || d?.recent_categories?.[0]?.name || 'Offline',
      };
    } catch (err) {
      continue;
    }
  }
  return null;
};

app.get('/api/kick/stream-info/:username', async (req, res) => {
  const { username } = req.params;
  const lowerUser = username.toLowerCase();

  const cached = streamInfoCache.get(lowerUser);
  if (cached && (Date.now() - cached.timestamp < 5 * 60 * 1000)) {
    return res.json({ success: true, ...cached.data });
  }

  let apiData = await fetchStreamInfoLightweight(username);
  
  if (!apiData) {
    if (activeFetches.has(lowerUser)) {
      console.log(`⏳ [Stream] Fetch already in progress for ${username}`);
    } else {
      console.log(`🔄 [Stream] API blocked for ${username}, falling back to Puppeteer...`);
      activeFetches.add(lowerUser);
      try {
        apiData = await pQueue.add(() => fetchKickDataViaPuppeteer(username));
      } catch (err) {
        console.error(`❌ [Stream] Puppeteer fallback failed:`, err.message);
      } finally {
        activeFetches.delete(lowerUser);
      }
    }
  }

  if (apiData) {
    const result = { exists: true, ...apiData };
    streamInfoCache.set(lowerUser, { timestamp: Date.now(), data: result });
    return res.json({ success: true, ...result });
  }

  const defaults = {
    exists: true,
    followers: 0,
    isLive: false,
    category: 'Slots',
  };
  return res.json({ success: true, ...defaults });
});

const fetchKickDataViaPuppeteer = async (username) => {
  let browser = null;
  try {
    console.log(`🚀 [Puppeteer] Launching browser for ${username}...`);
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    
    await page.goto(`https://kick.com/${username}`, { 
      waitUntil: 'networkidle2', 
      timeout: 45000 
    });

    await page.waitForSelector('body', { timeout: 10000 });

    const data = await page.evaluate(async (user) => {
      const timestamp = Date.now();
      let followers = 0;
      let bio = '';
      let isLive = false;
      let category = 'Offline';

      try {
        const res = await fetch(`/api/v2/channels/${user}?t=${timestamp}`);
        if (res.ok) {
          const json = await res.json();
          const d = json.data || json;
          followers = d.followers_count || d.followersCount || 0;
          bio = d.user?.bio || d.bio || '';
          isLive = !!(d.livestream && d.livestream.is_live);
          category = d.livestream?.categories?.[0]?.name || 'Offline';
        }
      } catch (e) {}

      if (!followers) {
        try {
          const followerEl = Array.from(document.querySelectorAll('span, div, p')).find(el => 
            el.textContent.toLowerCase().includes('followers') && /\d/.test(el.textContent)
          );
          if (followerEl) {
            const matches = followerEl.textContent.match(/[\d,.]+/);
            if (matches) followers = parseInt(matches[0].replace(/,/g, ''), 10);
          }
        } catch (e) {}
      }

      if (!bio) {
        try {
          const bioEl = document.querySelector('[data-test="user-bio"]') || document.querySelector('.user-bio');
          if (bioEl) bio = bioEl.textContent;
        } catch (e) {}
      }

      return { followers, bio, isLive, category };
    }, username);

    return data;
  } catch (err) {
    console.error(`❌ [Puppeteer] Error fetching ${username}:`, err.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
};

app.post('/api/auth/confirm', async (req, res) => {
  const { username } = req.body;
  const expectedCode = verificationCodes.get(username.toLowerCase());

  if (!expectedCode) {
    return res.status(400).json({ success: false, message: "Verification not started." });
  }

  console.log(`🔍 Verifying bio for ${username}... Expected code: ${expectedCode}`);

  let data = await pQueue.add(() => fetchKickDataViaPuppeteer(username));
  let bio = data?.bio || '';

  if (!bio || !bio.includes(expectedCode)) {
    console.log(`⏳ Code not found in first try for ${username}, retrying in 5s...`);
    await new Promise(r => setTimeout(r, 5000));
    data = await pQueue.add(() => fetchKickDataViaPuppeteer(username));
    bio = data?.bio || '';
  }

  if (bio && bio.includes(expectedCode)) {
    verificationCodes.delete(username.toLowerCase());
    
    try {
      let user = await User.findOne({ username: username.toLowerCase() });
      if (!user) {
        user = new User({
          username: username.toLowerCase(),
          avatar: `https://ui-avatars.com/api/?name=${username}&background=53fc18&color=000`
        });
      }
      user.lastLogin = new Date();
      await user.save();

      res.json({
        success: true,
        user: { 
          username: user.username, 
          avatar: user.avatar,
          isFollowing: user.isFollowing 
        }
      });

      new Activity({ user: username, action: "logged in" }).save();
    } catch (err) {
      console.error("DB Error during login:", err);
      res.status(500).json({ success: false, message: "Database error" });
    }
  } else {
    res.status(401).json({ success: false, message: "Code not found in bio. Make sure you saved it and your profile is public." });
  }
});

const base64URLEncode = (str) => {
  return str.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

const sha256 = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest();
};

app.get('/api/auth/kick', (req, res) => {
  const state = crypto.randomBytes(32).toString('hex');
  const codeVerifier = base64URLEncode(crypto.randomBytes(32));
  const codeChallenge = base64URLEncode(sha256(Buffer.from(codeVerifier)));
  const returnTo = req.query.return_to || '/';

  const cookieOptions = { 
    httpOnly: true, 
    maxAge: 900000, 
    sameSite: 'lax', 
    secure: false,
    path: '/'
  };
  
  console.log(`🔑 [OAuth] Starting for state: ${state}, returning to: ${returnTo}`);
  res.cookie('kick_auth_state', state, cookieOptions);
  res.cookie('kick_code_verifier', codeVerifier, cookieOptions);
  res.cookie('kick_return_to', returnTo, cookieOptions);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.KICK_CLIENT_ID,
    redirect_uri: process.env.KICK_REDIRECT_URI,
    scope: 'user:read',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  res.redirect(`https://id.kick.com/oauth/authorize?${params.toString()}`);
});

app.get('/api/auth/kick/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const storedState = req.cookies.kick_auth_state;
  const codeVerifier = req.cookies.kick_code_verifier;
  const returnTo = req.cookies.kick_return_to || '/';
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

  if (error) {
    return res.redirect(`${clientUrl}${returnTo}?error=${error}`);
  }

  console.log('🔍 OAuth Callback received');
  if (!state || state !== storedState) {
    console.error('❌ State mismatch error');
    return res.redirect(`${clientUrl}${returnTo}?error=state_mismatch`);
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('client_id', process.env.KICK_CLIENT_ID);
    params.append('client_secret', process.env.KICK_CLIENT_SECRET);
    params.append('redirect_uri', process.env.KICK_REDIRECT_URI);
    params.append('code_verifier', codeVerifier);

    const tokenResponse = await axios.post('https://id.kick.com/oauth/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token } = tokenResponse.data;

    const userResponse = await axios.get('https://api.kick.com/public/v1/users', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const kickUserRaw = userResponse.data;
    const kickUserData = (kickUserRaw?.data && kickUserRaw.data[0]) 
      ? kickUserRaw.data[0] 
      : (Array.isArray(kickUserRaw) ? kickUserRaw[0] : kickUserRaw);

    const username = kickUserData.name || kickUserData.username || kickUserData.display_name;
    const avatar = kickUserData.profile_picture || kickUserData.profile_image || kickUserData.avatar_url || `https://ui-avatars.com/api/?name=${username}&background=53fc18&color=000`;

    if (!username) throw new Error('Could not retrieve username from Kick API');

    let user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      user = new User({
        username: username.toLowerCase(),
        avatar: avatar
      });
    } else {
      user.avatar = avatar;
    }
    user.lastLogin = new Date();
    await user.save();

    new Activity({ user: username, action: "logged in via Kick" }).save();

    res.clearCookie('kick_auth_state');
    res.clearCookie('kick_code_verifier');
    res.clearCookie('kick_return_to');

    res.redirect(`${clientUrl}${returnTo}?login_success=true&username=${user.username}&avatar=${encodeURIComponent(user.avatar)}&coins=${user.coins}`);
  } catch (err) {
    console.error('❌ OAuth Detail Error:', err.response?.data || err.message);
    res.redirect(`${clientUrl}${returnTo}?error=auth_failed`);
  }
});

app.post('/api/user/follow', async (req, res) => {
  const { username, isFollowing } = req.body;
  if (!username) return res.status(400).json({ success: false });

  try {
    const user = await User.findOneAndUpdate(
      { username: username.toLowerCase() },
      { isFollowing },
      { new: true }
    );
    res.json({ success: true, isFollowing: user.isFollowing });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.get('/api/coins/balance/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const now = Date.now();
    const lastClaim = user.lastClaim ? new Date(user.lastClaim).getTime() : 0;
    const nextClaim = lastClaim + 60 * 60 * 1000;
    const canClaim = now >= nextClaim;
    res.json({ success: true, coins: user.coins, canClaim, nextClaimAt: nextClaim });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.post('/api/coins/claim', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ success: false, message: 'Username required' });
  try {
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const now = Date.now();
    const lastClaim = user.lastClaim ? new Date(user.lastClaim).getTime() : 0;
    const nextClaim = lastClaim + 60 * 60 * 1000;
    if (now < nextClaim) {
      return res.status(429).json({ success: false, message: 'Not ready yet', nextClaimAt: nextClaim });
    }
    user.coins += 20;
    user.lastClaim = new Date();
    await user.save();
    res.json({ success: true, coins: user.coins, nextClaimAt: Date.now() + 60 * 60 * 1000 });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.post('/api/games/play', async (req, res) => {
  const { username, game, betAmount, params } = req.body;
  if (!username || !game || !betAmount || betAmount < 1) {
    return res.status(400).json({ success: false, message: 'Invalid request' });
  }
  try {
    let user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      user = new User({
        username: username.toLowerCase(),
        avatar: `https://ui-avatars.com/api/?name=${username}&background=53fc18&color=000`,
        coins: 100
      });
      await user.save();
    }
    if (user.coins < betAmount) return res.status(400).json({ success: false, message: 'Not enough coins. Use the Faucet to claim more!' });

    let result = 'loss';
    let payout = 0;
    let details = {};

    if (game === 'dice') {
      const roll = Math.floor(Math.random() * 100) + 1;
      const { target, direction } = params;
      const win = direction === 'over' ? roll > target : roll < target;
      const chance = direction === 'over' ? (100 - target) / 100 : target / 100;
      const multiplier = chance > 0 ? parseFloat((0.98 / chance).toFixed(2)) : 1;
      if (win) { result = 'win'; payout = Math.floor(betAmount * multiplier); }
      details = { roll, target, direction, multiplier };

    } else if (game === 'limbo') {
      const { targetMultiplier } = params;
      const randomMultiplier = parseFloat((1 / (Math.random() * 0.97)).toFixed(2));
      if (randomMultiplier >= targetMultiplier) {
        result = 'win'; payout = Math.floor(betAmount * targetMultiplier);
      }
      details = { randomMultiplier, targetMultiplier };

    } else if (game === 'mines') {
      const { mineCount, revealedSafe } = params;
      const totalCells = 25;
      const safeCells = totalCells - mineCount;
      let multiplier = 1;
      for (let i = 0; i < revealedSafe; i++) {
        multiplier *= (safeCells - i) / (totalCells - i);
      }
      multiplier = parseFloat((0.97 / multiplier).toFixed(2));
      const hitMine = Math.random() < mineCount / (totalCells - revealedSafe);
      if (!hitMine) { result = 'win'; payout = Math.floor(betAmount * multiplier); }
      details = { mineCount, revealedSafe, multiplier, hitMine };

    } else if (game === 'dragon_tower') {
      const { level } = params;
      const hitBad = Math.random() < 1 / 3;
      const multiplier = parseFloat((Math.pow(1.5, level)).toFixed(2));
      if (!hitBad) { result = 'win'; payout = Math.floor(betAmount * multiplier); }
      details = { level, multiplier, hitBad };

    } else if (game === 'chicken') {
      // Allow legacy/simple play for chicken to verify connectivity
      const winnerIndex = Math.floor(Math.random() * 5);
      const { pick } = params || {};
      if (pick === winnerIndex) { result = 'win'; payout = betAmount * 5; }
      details = { winnerIndex, pick };
    } else if (game === 'keno') {
      const { picks, risk = 'classic' } = params || {};
      if (!Array.isArray(picks) || picks.length < 1 || picks.length > 10) {
        return res.status(400).json({ success: false, message: 'Select between 1 and 10 numbers' });
      }
      const uniquePicks = [...new Set(picks)];
      if (uniquePicks.length !== picks.length || !picks.every(p => p >= 1 && p <= 40)) {
        return res.status(400).json({ success: false, message: 'Invalid numbers selected. Must be unique between 1 and 40.' });
      }

      // Draw 10 unique random numbers from 1 to 40
      const pool = Array.from({ length: 40 }, (_, i) => i + 1);
      const drawn = [];
      for (let i = 0; i < 10; i++) {
        const randIdx = Math.floor(Math.random() * pool.length);
        drawn.push(pool[randIdx]);
        pool.splice(randIdx, 1);
      }

      const hits = picks.filter(p => drawn.includes(p));
      const hitCount = hits.length;

      const kenoMultipliers = {
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

      const selectedRisk = kenoMultipliers[risk] ? risk : 'classic';
      const multipliers = kenoMultipliers[selectedRisk][picks.length];
      const multiplier = multipliers[hitCount] || 0;

      if (multiplier > 0) {
        result = 'win';
        payout = Math.floor(betAmount * multiplier);
      }
      details = { drawn, hits, multiplier, picks, risk: selectedRisk };
    }

    if (game === 'limbo') {
      user.coins = result === 'win' ? user.coins + payout : user.coins - betAmount;
    } else {
      user.coins = result === 'win' ? user.coins - betAmount + payout : user.coins - betAmount;
    }
    await user.save();

    await new GameHistory({ username: username.toLowerCase(), game, betAmount, result, payout, details }).save();

    if (result === 'win') {
      new Activity({ user: username, action: `won ${payout} coins in ${game}` }).save();
    }

    res.json({ success: true, result, payout, coins: user.coins, details });
  } catch (err) {
    console.error('Game Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- STATEFUL DRAGON TOWER GAME ---

app.post('/api/games/dragon_tower/start', async (req, res) => {
  let { username, betAmount } = req.body;
  if (!username || !betAmount || betAmount < 1) {
    return res.status(400).json({ success: false, message: 'Invalid bet amount' });
  }
  username = username.toLowerCase();
  try {
    let user = await User.findOne({ username });
    if (!user) {
      user = new User({
        username,
        avatar: `https://ui-avatars.com/api/?name=${username}&background=53fc18&color=000`,
        coins: 100
      });
      await user.save();
    }
    if (user.coins < betAmount) {
      return res.status(400).json({ success: false, message: 'Not enough coins. Use the Faucet to claim more!' });
    }

    // Cancel existing active sessions for this user
    await GameSession.updateMany({ username, status: 'active' }, { status: 'ended', result: 'loss' });

    // Pre-generate bad egg indices for 5 levels (each level is 0, 1, or 2)
    const towerBadEggs = Array.from({ length: 5 }, () => Math.floor(Math.random() * 3));

    user.coins -= betAmount;
    await user.save();

    const session = new GameSession({
      username,
      gameType: 'dragon_tower',
      betAmount,
      towerBadEggs,
      currentLevel: 1,
      totalLevels: 5,
      eggsPerLevel: 3,
      status: 'active'
    });
    await session.save();

    res.json({ success: true, coins: user.coins, sessionId: session._id });
  } catch (err) {
    console.error('Dragon Tower Start Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/games/dragon_tower/pick', async (req, res) => {
  let { username, eggIndex } = req.body;
  if (!username || eggIndex === undefined || eggIndex < 0 || eggIndex > 2) {
    return res.status(400).json({ success: false, message: 'Invalid pick parameter' });
  }
  username = username.toLowerCase();
  try {
    const session = await GameSession.findOne({ username, gameType: 'dragon_tower', status: 'active' });
    if (!session) {
      return res.status(404).json({ success: false, message: 'No active session found' });
    }

    const { currentLevel, towerBadEggs, betAmount, totalLevels } = session;
    const badEggIndex = towerBadEggs[currentLevel - 1];
    const hitBad = eggIndex === badEggIndex;

    // Record this pick
    session.revealedIndices.push(eggIndex);

    if (hitBad) {
      // LOSE
      session.status = 'ended';
      session.result = 'loss';
      session.payout = 0;
      await session.save();

      await new GameHistory({
        username,
        game: 'dragon_tower',
        betAmount,
        result: 'loss',
        payout: 0,
        details: { level: currentLevel, hitBad: true, towerBadEggs }
      }).save();

      return res.json({
        success: true,
        status: 'ended',
        result: 'loss',
        payout: 0,
        details: { level: currentLevel, hitBad: true, badEggIndex, towerBadEggs }
      });
    } else {
      // SAFE
      const multiplier = parseFloat((Math.pow(1.5, currentLevel)).toFixed(2));
      const nextMultiplier = parseFloat((Math.pow(1.5, currentLevel + 1)).toFixed(2));
      const currentWinnings = Math.floor(betAmount * multiplier);

      if (currentLevel === totalLevels) {
        // CONQUERED THE TOWER!
        session.status = 'ended';
        session.result = 'win';
        session.payout = currentWinnings;
        await session.save();

        const user = await User.findOne({ username });
        user.coins += currentWinnings;
        await user.save();

        await new GameHistory({
          username,
          game: 'dragon_tower',
          betAmount,
          result: 'win',
          payout: currentWinnings,
          details: { level: currentLevel, hitBad: false, towerBadEggs }
        }).save();

        new Activity({ user: username, action: `conquered the Dragon Tower for ${currentWinnings} coins!` }).save();

        return res.json({
          success: true,
          status: 'ended',
          result: 'win',
          payout: currentWinnings,
          coins: user.coins,
          details: { level: currentLevel, hitBad: false, multiplier, towerBadEggs }
        });
      } else {
        // Advance to next level
        session.currentLevel += 1;
        await session.save();

        return res.json({
          success: true,
          status: 'active',
          currentLevel: session.currentLevel,
          multiplier,
          nextMultiplier,
          currentWinnings,
          details: { level: currentLevel, hitBad: false, multiplier }
        });
      }
    }
  } catch (err) {
    console.error('Dragon Tower Pick Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/games/dragon_tower/cashout', async (req, res) => {
  let { username } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, message: 'Username required' });
  }
  username = username.toLowerCase();
  try {
    const session = await GameSession.findOne({ username, gameType: 'dragon_tower', status: 'active' });
    if (!session) {
      return res.status(404).json({ success: false, message: 'No active session found' });
    }

    const { currentLevel, betAmount, towerBadEggs } = session;
    if (currentLevel <= 1) {
      return res.status(400).json({ success: false, message: 'Cannot cashout before making at least one safe pick' });
    }

    const multiplier = parseFloat((Math.pow(1.5, currentLevel - 1)).toFixed(2));
    const payout = Math.floor(betAmount * multiplier);

    session.status = 'ended';
    session.result = 'win';
    session.payout = payout;
    await session.save();

    const user = await User.findOne({ username });
    user.coins += payout;
    await user.save();

    await new GameHistory({
      username,
      game: 'dragon_tower',
      betAmount,
      result: 'win',
      payout,
      details: { level: currentLevel - 1, cashedOut: true, towerBadEggs }
    }).save();

    new Activity({ user: username, action: `cashed out ${payout} coins on Floor ${currentLevel - 1} in Dragon Tower` }).save();

    res.json({
      success: true,
      payout,
      coins: user.coins,
      details: { level: currentLevel - 1, cashedOut: true, multiplier }
    });
  } catch (err) {
    console.error('Dragon Tower Cashout Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- STATEFUL MINES GAME ---

app.post('/api/games/mines/start', async (req, res) => {
  let { username, betAmount, mineCount } = req.body;
  if (!username) return res.status(400).json({ success: false, message: 'Username required' });
  username = username.toLowerCase();
  betAmount = parseInt(betAmount) || 0;
  mineCount = parseInt(mineCount) || 0;

  if (betAmount < 1 || mineCount < 1 || mineCount > 24) {
    return res.status(400).json({ success: false, message: 'Invalid bet or mine count' });
  }

  try {
    let user = await User.findOne({ username });
    if (!user) {
      user = new User({
        username,
        avatar: `https://ui-avatars.com/api/?name=${username}&background=53fc18&color=000`,
        coins: 100
      });
      await user.save();
    }

    if (user.coins < betAmount) {
      return res.status(400).json({ success: false, message: 'Not enough coins. Use the Faucet to claim more!' });
    }

    // Cancel existing active sessions
    await GameSession.updateMany({ username, status: 'active' }, { status: 'ended', result: 'loss' });

    // Generate grid of 25 tiles
    const totalTiles = 25;
    const grid = new Array(totalTiles).fill('safe');
    let minesPlaced = 0;
    while (minesPlaced < mineCount) {
      const idx = Math.floor(Math.random() * totalTiles);
      if (grid[idx] !== 'mine') {
        grid[idx] = 'mine';
        minesPlaced++;
      }
    }

    user.coins -= betAmount;
    await user.save();

    const session = new GameSession({
      username,
      gameType: 'mines',
      betAmount,
      mineCount,
      grid,
      status: 'active'
    });
    await session.save();

    res.json({ success: true, sessionId: session._id, coins: user.coins });
  } catch (err) {
    console.error('Mines Start Error:', err);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

app.post('/api/games/mines/reveal', async (req, res) => {
  let { username, index } = req.body;
  if (!username) return res.status(400).json({ success: false });
  username = username.toLowerCase();
  try {
    const session = await GameSession.findOne({ username, gameType: 'mines', status: 'active' });
    if (!session) return res.status(404).json({ success: false, message: 'No active session found' });

    if (session.revealedIndices.includes(index)) {
      return res.status(400).json({ success: false, message: 'Already revealed' });
    }

    session.revealedIndices.push(index);
    const item = session.grid[index];

    if (item === 'mine') {
      session.status = 'ended';
      session.result = 'loss';
      session.payout = 0;
      await session.save();

      await new GameHistory({
        username,
        game: 'mines',
        betAmount: session.betAmount,
        result: 'loss',
        payout: 0,
        details: { mineCount: session.mineCount, hitMine: true, revealedCount: session.revealedIndices.length }
      }).save();

      return res.json({ success: true, status: 'ended', result: 'loss', grid: session.grid });
    } else {
      const revealedSafeCount = session.revealedIndices.length;
      const totalSafeCells = 25 - session.mineCount;

      const multiplier = calculateMultiplier(25, session.mineCount, revealedSafeCount);
      const nextMultiplier = calculateMultiplier(25, session.mineCount, revealedSafeCount + 1);
      const currentWinnings = Math.floor(session.betAmount * multiplier);

      if (revealedSafeCount === totalSafeCells) {
        // Conquered!
        session.status = 'ended';
        session.result = 'win';
        session.payout = currentWinnings;
        await session.save();

        const user = await User.findOne({ username });
        user.coins += currentWinnings;
        await user.save();

        new Activity({ user: username, action: `conquered Mines and won ${currentWinnings} coins!` }).save();
        await new GameHistory({
          username,
          game: 'mines',
          betAmount: session.betAmount,
          result: 'win',
          payout: currentWinnings,
          details: { mineCount: session.mineCount, revealedCount: revealedSafeCount }
        }).save();

        return res.json({ success: true, status: 'ended', result: 'win', payout: currentWinnings, coins: user.coins, grid: session.grid });
      } else {
        await session.save();
        return res.json({
          success: true,
          status: 'active',
          result: 'win',
          revealedItem: 'safe',
          multiplier,
          nextMultiplier,
          currentWinnings
        });
      }
    }
  } catch (err) {
    console.error('Mines Reveal Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/games/mines/cashout', async (req, res) => {
  let { username } = req.body;
  if (!username) return res.status(400).json({ success: false, message: 'Username required' });
  username = username.toLowerCase();
  try {
    const session = await GameSession.findOne({ username, gameType: 'mines', status: 'active' });
    if (!session) return res.status(404).json({ success: false, message: 'No active session found' });

    if (session.revealedIndices.length === 0) {
      return res.status(400).json({ success: false, message: 'Cannot cashout with 0 picks' });
    }

    const multiplier = calculateMultiplier(25, session.mineCount, session.revealedIndices.length);
    const payout = Math.floor(session.betAmount * multiplier);

    session.status = 'ended';
    session.result = 'win';
    session.payout = payout;
    await session.save();

    const user = await User.findOne({ username });
    user.coins += payout;
    await user.save();

    new Activity({ user: username, action: `cashed out ${payout} coins in Mines` }).save();
    await new GameHistory({
      username,
      game: 'mines',
      betAmount: session.betAmount,
      result: 'win',
      payout,
      details: { mineCount: session.mineCount, revealedCount: session.revealedIndices.length }
    }).save();

    res.json({ success: true, payout, coins: user.coins, grid: session.grid });
  } catch (err) {
    console.error('Mines Cashout Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// --- STATEFUL CHICKEN GAME ---

function calculateMultiplier(total, bones, revealed) {
  if (revealed === 0) return 1;
  let prob = 1;
  for (let i = 0; i < revealed; i++) {
    prob *= (total - bones - i) / (total - i);
  }
  return parseFloat((0.97 / prob).toFixed(4));
}

app.post('/api/games/chicken/start', async (req, res) => {
  console.log('🐔 [Chicken] Start requested:', req.body);
  let { username, betAmount, boneCount } = req.body;
  
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ success: false, message: "Invalid username" });
  }

  username = username.toLowerCase();
  betAmount = parseInt(betAmount) || 0;
  boneCount = parseInt(boneCount) || 0;

  if (betAmount < 1 || boneCount < 1 || boneCount > 24) {
    return res.status(400).json({ success: false, message: "Invalid bet or bones" });
  }

  try {
    let user = await User.findOne({ username });
    if (!user) {
      user = new User({
        username,
        avatar: `https://ui-avatars.com/api/?name=${username}&background=53fc18&color=000`,
        coins: 100
      });
      await user.save();
    }

    if (user.coins < betAmount) {
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    // Cancel any existing active sessions
    await GameSession.updateMany({ username, status: 'active' }, { status: 'ended', result: 'loss' });

    // Generate grid
    const totalTiles = 25;
    const grid = new Array(totalTiles).fill('chicken');
    let bonesPlaced = 0;
    while (bonesPlaced < boneCount) {
      const idx = Math.floor(Math.random() * totalTiles);
      if (grid[idx] !== 'bone') {
        grid[idx] = 'bone';
        bonesPlaced++;
      }
    }

    user.coins -= betAmount;
    await user.save();

    const session = new GameSession({
      username,
      gameType: 'chicken',
      betAmount,
      boneCount,
      grid,
      status: 'active'
    });
    await session.save();

    res.json({ success: true, sessionId: session._id, coins: user.coins });
  } catch (err) {
    console.error('❌ [Chicken] Start Error:', err);
    res.status(500).json({ success: false, message: "Server error: " + err.message });
  }
});

app.post('/api/games/chicken/reveal', async (req, res) => {
  let { username, index } = req.body;
  if (!username) return res.status(400).json({ success: false });
  username = username.toLowerCase();
  try {
    const session = await GameSession.findOne({ username, status: 'active' });
    if (!session) return res.status(404).json({ success: false, message: "No active game" });

    if (session.revealedIndices.includes(index)) {
      return res.status(400).json({ success: false, message: "Already revealed" });
    }

    session.revealedIndices.push(index);
    const item = session.grid[index];

    if (item === 'bone') {
      session.status = 'ended';
      session.result = 'loss';
      session.payout = 0;
      await session.save();
      return res.json({ success: true, status: 'ended', result: 'loss', grid: session.grid });
    } else {
      const multiplier = calculateMultiplier(25, session.boneCount, session.revealedIndices.length);
      const nextMultiplier = calculateMultiplier(25, session.boneCount, session.revealedIndices.length + 1);
      
      await session.save();
      res.json({ 
        success: true, 
        status: 'active', 
        result: 'win', 
        revealedItem: 'chicken', 
        multiplier,
        nextMultiplier,
        currentWinnings: Math.floor(session.betAmount * multiplier)
      });
    }
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.post('/api/games/chicken/cashout', async (req, res) => {
  let { username } = req.body;
  if (!username) return res.status(400).json({ success: false });
  username = username.toLowerCase();
  try {
    const session = await GameSession.findOne({ username, status: 'active' });
    if (!session) return res.status(404).json({ success: false, message: "No active game" });

    if (session.revealedIndices.length === 0) {
      return res.status(400).json({ success: false, message: "Cannot cashout with 0 picks" });
    }

    const multiplier = calculateMultiplier(25, session.boneCount, session.revealedIndices.length);
    const payout = Math.floor(session.betAmount * multiplier);

    session.status = 'ended';
    session.result = 'win';
    session.payout = payout;
    await session.save();

    const user = await User.findOne({ username: username.toLowerCase() });
    user.coins += payout;
    await user.save();

    new Activity({ user: username, action: `cashed out ${payout} coins in Chicken` }).save();
    await new GameHistory({ username: username.toLowerCase(), game: 'chicken', betAmount: session.betAmount, result: 'win', payout, details: { boneCount: session.boneCount, revealedCount: session.revealedIndices.length } }).save();

    res.json({ success: true, payout, coins: user.coins, grid: session.grid });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📡 Internal IP: http://127.0.0.1:${PORT}`);
  
  setTimeout(() => {
    console.log('📡 Prefetching MIARUSH stream info...');
    if (activeFetches.has('miarush')) return;
    activeFetches.add('miarush');
    
    pQueue.add(() => fetchKickDataViaPuppeteer('miarush')).then(data => {
      if (data) {
        streamInfoCache.set('miarush', { 
          timestamp: Date.now(), 
          data: { exists: true, ...data } 
        });
        console.log(`✅ Prefetch complete. Followers: ${data.followers}, Live: ${data.isLive}`);
      } else {
        console.log('⚠️ Prefetch failed, will try again on first request.');
      }
    }).catch(err => {
      console.log('⚠️ Prefetch error:', err.message);
    }).finally(() => {
      activeFetches.delete('miarush');
    });
  }, 10000);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    process.exit(1);
  }
});

async function seedDatabase() {
  try {
    const playerCount = await Player.countDocuments();
    if (playerCount === 0) {
      console.log('🌱 Seeding initial leaderboard data...');
      const initialPlayers = [
        { rank: 1, username: "PlayerOne", wageredUsd: 15000, xp: 2450, level: 24, badges: ["👑", "🔥"] },
        { rank: 2, username: "HighRoller", wageredUsd: 12500, xp: 2100, level: 21, badges: ["🎯"] },
        { rank: 3, username: "LuckyStar", wageredUsd: 10000, xp: 1800, level: 18, badges: ["🎰"] },
        { rank: 4, username: "CryptoKing", wageredUsd: 8500, xp: 1500, level: 15, badges: [] },
        { rank: 5, username: "BetMaster", wageredUsd: 7000, xp: 1200, level: 12, badges: [] },
        { rank: 6, username: "Jackpot777", wageredUsd: 5500, xp: 900, level: 9, badges: [] },
        { rank: 7, username: "SpinWin", wageredUsd: 4000, xp: 750, level: 7, badges: [] },
        { rank: 8, username: "LuckyCharm", wageredUsd: 3000, xp: 600, level: 6, badges: [] },
        { rank: 9, username: "BetPro", wageredUsd: 2000, xp: 450, level: 4, badges: [] },
        { rank: 10, username: "NewPlayer", wageredUsd: 1000, xp: 200, level: 2, badges: [] }
      ];
      await Player.insertMany(initialPlayers);
    }

    const activityCount = await Activity.countDocuments();
    if (activityCount === 0) {
      console.log('🌱 Seeding initial activity data...');
      const initialActivity = [
        { user: "PlayerOne", action: "reached Level 24", timestamp: new Date() },
        { user: "LuckyStar", action: "won $250 in a raffle", timestamp: new Date(Date.now() - 1000 * 60 * 5) },
        { user: "HighRoller", action: "just wagered $1,200", timestamp: new Date(Date.now() - 1000 * 60 * 15) }
      ];
      await Activity.insertMany(initialActivity);
    }

    setInterval(async () => {
      try {
        const fakeUsers = ['CryptoKing', 'BetMaster', 'Jackpot777', 'SpinWin', 'HighRoller', 'LuckyStar', 'PrismPlayer', 'Whale99', 'DiceGod', 'LimboKing'];
        const fakeGames = ['dice', 'limbo', 'mines', 'dragon_tower', 'chicken', 'keno'];
        
        const randomUser = fakeUsers[Math.floor(Math.random() * fakeUsers.length)];
        const randomGame = fakeGames[Math.floor(Math.random() * fakeGames.length)];
        
        const isWin = Math.random() > 0.6;
        
        let actionStr = '';
        if (isWin) {
          const winAmount = Math.floor(Math.random() * 500) + 50;
          actionStr = `won ${winAmount} coins in ${randomGame}`;
        } else {
          const wagerAmount = Math.floor(Math.random() * 100) + 10;
          actionStr = `wagered ${wagerAmount} coins in ${randomGame}`;
        }

        if (Math.random() > 0.9) {
          const level = Math.floor(Math.random() * 50) + 2;
          actionStr = `reached Level ${level}`;
        }

        await new Activity({ user: randomUser, action: actionStr, timestamp: new Date() }).save();
        
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        await Activity.deleteMany({ timestamp: { $lt: yesterday } });
        
      } catch (e) {
        console.error("Activity Simulator Error:", e.message);
      }
    }, 45000);

  } catch (err) {
    console.error("❌ Seeding Error:", err);
  }
}
