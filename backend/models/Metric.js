const mongoose = require('mongoose')

const metricSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  type: {
    type: String,
    enum: ['habit', 'counter'],
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  goalId: {
    type: String,
    ref: 'Goal',
    default: null
  },
  initialValue: {
    type: Number,
    default: 0
  },
  targetValue: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    default: 'units'
  },
  inputMode: {
    type: String,
    enum: ['fixed_step', 'manual'],
    default: 'fixed_step'
  },
  stepValue: {
    type: Number,
    default: 1,
    min: 0.01
  },
  periodicity: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly', 'every_n_days', 'weekdays'],
    default: 'daily'
  },
  nDays: {
    type: Number,
    default: null,
    min: 1
  },
  weekdays: {
    type: [Number], // 0-6 (Sunday-Saturday)
    default: null
  },
  color: {
    type: String,
    default: '#3b82f6'
  },
  userId: {
    type: String,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
})

// Virtual fields
metricSchema.virtual('entries', {
  ref: 'MetricEntry',
  localField: '_id',
  foreignField: 'metricId'
})

// Index for faster queries
metricSchema.index({ userId: 1 })
metricSchema.index({ goalId: 1 })
metricSchema.index({ type: 1 })

// Ensure virtuals are included in JSON
metricSchema.set('toJSON', { virtuals: true })
metricSchema.set('toObject', { virtuals: true })

module.exports = mongoose.model('Metric', metricSchema)
