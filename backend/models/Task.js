const mongoose = require('mongoose')

const subtaskSchema = new mongoose.Schema({
  _id: {
    type: String,
    auto: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  completed: {
    type: Boolean,
    default: false
  }
}, { _id: true })

const taskSchema = new mongoose.Schema({
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
  stageId: {
    type: String,
    ref: 'Stage',
    default: null
  },
  categoryId: {
    type: String,
    ref: 'Category',
    required: true
  },
  startDate: {
    type: Date,
    default: null
  },
  dueDate: {
    type: Date,
    default: null
  },
  isPeriodBased: {
    type: Boolean,
    default: false
  },
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  complexity: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  weight: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  completed: {
    type: Boolean,
    default: false
  },
  subtasks: [subtaskSchema],
  userId: {
    type: String,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
})

// Index for faster queries
taskSchema.index({ goalId: 1 })
taskSchema.index({ stageId: 1 })
taskSchema.index({ categoryId: 1 })
taskSchema.index({ userId: 1 })
taskSchema.index({ completed: 1 })
taskSchema.index({ dueDate: 1 })

// Ensure virtuals are included in JSON
taskSchema.set('toJSON', { virtuals: true })
taskSchema.set('toObject', { virtuals: true })

module.exports = mongoose.model('Task', taskSchema)
