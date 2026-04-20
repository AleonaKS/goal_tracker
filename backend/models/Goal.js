const mongoose = require('mongoose')

const goalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  categoryId: {
    type: String,
    ref: 'Category',
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  deadlineType: {
    type: String,
    enum: ['none', 'specific_date', 'month_year', 'year'],
    default: 'none'
  },
  deadlineValue: {
    type: mongoose.Schema.Types.Mixed, // Can be Date or string
    default: null
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'overdue', 'planned', 'frozen'],
    default: 'in_progress'
  },
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  progressCalculation: {
    type: String,
    enum: ['by_tasks', 'by_metric'],
    default: 'by_tasks'
  },
  progressMetricId: {
    type: String,
    ref: 'Metric',
    default: null
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
goalSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'goalId'
})

goalSchema.virtual('stages', {
  ref: 'Stage',
  localField: '_id',
  foreignField: 'goalId'
})

goalSchema.virtual('metrics', {
  ref: 'Metric',
  localField: '_id',
  foreignField: 'goalId'
})

// Index for faster queries
goalSchema.index({ userId: 1 })
goalSchema.index({ categoryId: 1 })
goalSchema.index({ status: 1 })
goalSchema.index({ priority: -1 })

// Ensure virtuals are included in JSON
goalSchema.set('toJSON', { virtuals: true })
goalSchema.set('toObject', { virtuals: true })

module.exports = mongoose.model('Goal', goalSchema)
