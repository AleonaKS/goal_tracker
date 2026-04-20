const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  login: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  settings: {
    monthYearHandling: {
      type: String,
      enum: ['start', 'end'],
      default: 'end'
    },
    yearHandling: {
      type: String,
      enum: ['start', 'end'],
      default: 'end'
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password
      return ret
    }
  }
})

// Index for faster queries
userSchema.index({ email: 1 })
userSchema.index({ login: 1 })

module.exports = mongoose.model('User', userSchema)
