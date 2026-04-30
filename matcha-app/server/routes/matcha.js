// server/routes/matcha.js
const express = require('express');
const Matcha  = require('../models/Matcha');
const auth    = require('../middleware/authMiddleware');

const router = express.Router();

// ── GET /api/matcha ───────────────────────────
// Public. Supports ?sort=date|rating|name and ?drinkType=latte etc.
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.drinkType) {
      filter.drinkType = req.query.drinkType;
    }

    const sortMap = {
      rating: { rating: -1 },
      name:   { placeName: 1 },
      date:   { createdAt: -1 }
    };
    const sort = sortMap[req.query.sort] || { createdAt: -1 };

    const entries = await Matcha.find(filter).sort(sort);
    return res.json(entries);
  } catch (err) {
    console.error('GET / error:', err);
    return res.status(500).json({ error: 'Could not load entries.' });
  }
});

// ── GET /api/matcha/:id ───────────────────────
// Public. Used by the edit form to pre-populate fields.
router.get('/:id', async (req, res) => {
  try {
    const entry = await Matcha.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found.' });
    }
    return res.json(entry);
  } catch (err) {
    console.error('GET /:id error:', err);
    return res.status(500).json({ error: 'Could not load entry.' });
  }
});

// ── POST /api/matcha ──────────────────────────
// Protected. Creates a new entry for the logged-in user.
router.post('/', auth, async (req, res) => {
  const { placeName, location, drinkType, rating, price, notes } = req.body;

  // Server-side validation
  if (!placeName || !placeName.trim()) {
    return res.status(400).json({ error: 'Place name is required.' });
  }
  if (!location || !location.trim()) {
    return res.status(400).json({ error: 'Location is required.' });
  }
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
  }

  try {
    const entry = await Matcha.create({
      placeName: placeName.trim(),
      location:  location.trim(),
      drinkType: drinkType || 'other',
      rating:    Number(rating),
      price:     price ? Number(price) : null,
      notes:     notes ? notes.trim() : '',
      userId:    req.user.id,
      username:  req.user.username
    });
    return res.status(201).json(entry);
  } catch (err) {
    console.error('POST / error:', err);
    return res.status(500).json({ error: 'Could not save entry.' });
  }
});

// ── PUT /api/matcha/:id ───────────────────────
// Protected. Only the original author can edit.
router.put('/:id', auth, async (req, res) => {
  try {
    const entry = await Matcha.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found.' });
    }

    // Ownership check
    if (entry.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: 'You can only edit your own entries.' });
    }

    const { placeName, location, drinkType, rating, price, notes } = req.body;

    // Validate fields that were provided
    if (placeName !== undefined && !placeName.trim()) {
      return res.status(400).json({ error: 'Place name cannot be empty.' });
    }
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }

    // Apply updates
    if (placeName !== undefined) entry.placeName = placeName.trim();
    if (location  !== undefined) entry.location  = location.trim();
    if (drinkType !== undefined) entry.drinkType = drinkType;
    if (rating    !== undefined) entry.rating    = Number(rating);
    if (price     !== undefined) entry.price     = price ? Number(price) : null;
    if (notes     !== undefined) entry.notes     = notes.trim();

    await entry.save();
    return res.json(entry);
  } catch (err) {
    console.error('PUT /:id error:', err);
    return res.status(500).json({ error: 'Could not update entry.' });
  }
});

// ── DELETE /api/matcha/:id ────────────────────
// Protected. Only the original author can delete.
router.delete('/:id', auth, async (req, res) => {
  try {
    const entry = await Matcha.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found.' });
    }

    // Ownership check
    if (entry.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: 'You can only delete your own entries.' });
    }

    await entry.deleteOne();
    return res.json({ message: 'Entry deleted.' });
  } catch (err) {
    console.error('DELETE /:id error:', err);
    return res.status(500).json({ error: 'Could not delete entry.' });
  }
});

module.exports = router;