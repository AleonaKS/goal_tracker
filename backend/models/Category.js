const mongoose = require('mongoose')

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200
  },
  icon: {
    type: String,
    default: 'folder'
  },
  color: {
    type: String,
    required: true,
    default: '#3b82f6'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  userId: {
    type: String,
    required: true
  }
}, {
  timestamps: true
})


// Index for faster queries
categorySchema.index({ userId: 1 })
categorySchema.index({ name: 1, userId: 1 })


module.exports = mongoose.model('Category', categorySchema, 'categories')
