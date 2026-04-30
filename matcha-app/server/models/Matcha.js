// server/models/Matcha.js
const mongoose = require('mongoose');

const MatchaSchema = new mongoose.Schema({
  placeName: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  drinkType: {
    type: String,
    enum: ['ceremonial', 'latte', 'soft serve', 'dessert', 'other'],
    default: 'other'
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  price: {
    type: Number,
    min: 0,
    default: null
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  userId: {
    // references the User who created this entry
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    // stored directly so feed can display it without a join
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Matcha', MatchaSchema);