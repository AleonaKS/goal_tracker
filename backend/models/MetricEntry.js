const mongoose = require('mongoose')

const metricEntrySchema = new mongoose.Schema({
  metricId: {
    type: String,
    ref: 'Metric',
    required: true
  },
  value: {
    type: Number,
    required: true
  },
  finalValue: {
    type: Number,
    default: null
  },
  note: {
    type: String,
    trim: true,
    maxlength: 500
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isAddition: {
    type: Boolean,
    default: true
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
metricEntrySchema.index({ metricId: 1 })
metricEntrySchema.index({ userId: 1 })
metricEntrySchema.index({ timestamp: -1 })

// Ensure virtuals are included in JSON
metricEntrySchema.set('toJSON', { virtuals: true })
metricEntrySchema.set('toObject', { virtuals: true })

module.exports = mongoose.model('MetricEntry', metricEntrySchema)
