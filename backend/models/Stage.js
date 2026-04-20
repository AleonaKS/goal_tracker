const mongoose = require('mongoose')

const stageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  goalId: {
    type: String,
    ref: 'Goal',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
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
stageSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'stageId'
})

// Validation
stageSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'))
  } else {
    next()
  }
})

// Index for faster queries
stageSchema.index({ goalId: 1 })
stageSchema.index({ userId: 1 })
stageSchema.index({ startDate: 1 })

// Ensure virtuals are included in JSON
stageSchema.set('toJSON', { virtuals: true })
stageSchema.set('toObject', { virtuals: true })

module.exports = mongoose.model('Stage', stageSchema)
