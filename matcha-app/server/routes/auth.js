// server/routes/auth.js
const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');

const router = express.Router();

// ── POST /api/auth/signup ─────────────────────
router.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  // Server-side input validation
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  if (username.trim().length < 2) {
    return res.status(400).json({ error: 'Username must be at least 2 characters.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const existing = await User.findOne({ username: username.trim() });
    if (existing) {
      return res.status(409).json({ error: 'Username is already taken.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user   = await User.create({ username: username.trim(), password: hashed });

    return res.status(201).json({ message: 'Account created.', userId: user._id });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ── POST /api/auth/login ──────────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({ token, username: user.username });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ── POST /api/auth/logout ─────────────────────
// Token-based auth is stateless — logout is handled client-side by
// deleting the token from localStorage. This endpoint exists so the
// client has a clean logout call and the server can log it if needed.
router.post('/logout', (req, res) => {
  return res.json({ message: 'Logged out successfully.' });
});

module.exports = router;