const mongoose = require('mongoose')

const achievementSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['habit', 'counter', 'task'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  value: {
    type: Number,
    default: null
  },
  date: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: String,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
})

// Index for faster queries
achievementSchema.index({ userId: 1 })
achievementSchema.index({ type: 1 })
achievementSchema.index({ date: -1 })

// Ensure virtuals are included in JSON
achievementSchema.set('toJSON', { virtuals: true })
achievementSchema.set('toObject', { virtuals: true })

module.exports = mongoose.model('Achievement', achievementSchema)
