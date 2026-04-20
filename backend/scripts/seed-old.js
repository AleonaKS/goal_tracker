const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
require('dotenv').config()

// Import models
const User = require('../models/User')
const Category = require('../models/Category')
const Goal = require('../models/Goal')
const Stage = require('../models/Stage')
const Task = require('../models/Task')
const Metric = require('../models/Metric')
const MetricEntry = require('../models/MetricEntry')
const Achievement = require('../models/Achievement')

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goaltracker')
    console.log('Connected to MongoDB')

    // Clear existing data
    await User.deleteMany({})
    await Category.deleteMany({})
    await Goal.deleteMany({})
    await Stage.deleteMany({})
    await Task.deleteMany({})
    await Metric.deleteMany({})
    await MetricEntry.deleteMany({})
    await Achievement.deleteMany({})
    console.log('Cleared existing data')

    // Create demo user
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash('demo123', salt)
    
    const demoUser = new User({
      login: 'demo',
      email: 'demo@example.com',
      password: hashedPassword,
      settings: {
        monthYearHandling: 'end',
        yearHandling: 'end'
      }
    })
    await demoUser.save()
    console.log('Created demo user')

    // Create default categories
    const categories = await Category.insertMany([
      {
        name: 'Professional',
        description: 'Career and work-related goals',
        icon: 'briefcase',
        color: '#3b82f6',
        isDefault: true,
        userId: demoUser._id
      },
      {
        name: 'Health',
        description: 'Physical and mental health goals',
        icon: 'heart',
        color: '#ef4444',
        isDefault: true,
        userId: demoUser._id
      },
      {
        name: 'Education',
        description: 'Learning and skill development',
        icon: 'book',
        color: '#f59e0b',
        isDefault: true,
        userId: demoUser._id
      },
      {
        name: 'Finance',
        description: 'Financial goals and savings',
        icon: 'dollar-sign',
        color: '#10b981',
        isDefault: true,
        userId: demoUser._id
      },
      {
        name: 'Personal',
        description: 'Personal growth and relationships',
        icon: 'user',
        color: '#8b5cf6',
        isDefault: true,
        userId: demoUser._id
      }
    ])
    console.log('Created default categories')

    // Create sample goals
    const goals = await Goal.insertMany([
      {
        name: 'Learn TypeScript',
        categoryId: categories[2]._id, // Education
        description: 'Master TypeScript for advanced web development',
        deadlineType: 'specific_date',
        deadlineValue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        priority: 5,
        userId: demoUser._id
      },
      {
        name: 'Run Marathon',
        categoryId: categories[1]._id, // Health
        description: 'Complete a full marathon (42.195 km)',
        deadlineType: 'month_year',
        deadlineValue: '2024-12',
        priority: 4,
        userId: demoUser._id
      },
      {
        name: 'Build SaaS Application',
        categoryId: categories[0]._id, // Professional
        description: 'Launch a profitable SaaS product',
        deadlineType: 'year',
        deadlineValue: '2024',
        priority: 5,
        userId: demoUser._id
      }
    ])
    console.log('Created sample goals')

    // Create stages for goals
    const stages = await Stage.insertMany([
      {
        name: 'Learn Basics',
        goalId: goals[0]._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        userId: demoUser._id
      },
      {
        name: 'Build Projects',
        goalId: goals[0]._id,
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        userId: demoUser._id
      },
      {
        name: 'Advanced Topics',
        goalId: goals[0]._id,
        startDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        userId: demoUser._id
      }
    ])
    console.log('Created stages')

    // Create tasks
    const tasks = await Task.insertMany([
      {
        name: 'Complete TypeScript Handbook',
        goalId: goals[0]._id,
        stageId: stages[0]._id,
        categoryId: categories[2]._id,
        priority: 5,
        weight: 8,
        completed: true,
        subtasks: [
          { name: 'Read chapters 1-5', completed: true },
          { name: 'Complete exercises', completed: true }
        ],
        userId: demoUser._id
      },
      {
        name: 'Build React App with TypeScript',
        goalId: goals[0]._id,
        stageId: stages[1]._id,
        categoryId: categories[2]._id,
        priority: 4,
        weight: 7,
        completed: false,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        userId: demoUser._id
      },
      {
        name: 'Morning Run - 5km',
        goalId: goals[1]._id,
        categoryId: categories[1]._id,
        priority: 3,
        weight: 5,
        completed: false,
        isPeriodBased: true,
        userId: demoUser._id
      }
    ])
    console.log('Created tasks')

    // Create metrics
    const metrics = await Metric.insertMany([
      {
        name: 'Daily Study Hours',
        type: 'counter',
        description: 'Track daily study time for TypeScript',
        goalId: goals[0]._id,
        targetValue: 100,
        unit: 'hours',
        inputMode: 'manual',
        periodicity: 'daily',
        color: '#3b82f6',
        userId: demoUser._id
      },
      {
        name: 'Running Distance',
        type: 'counter',
        description: 'Track weekly running distance',
        goalId: goals[1]._id,
        targetValue: 42.195,
        unit: 'km',
        inputMode: 'manual',
        periodicity: 'weekly',
        color: '#ef4444',
        userId: demoUser._id
      },
      {
        name: 'Morning Meditation',
        type: 'habit',
        description: 'Daily meditation practice',
        targetValue: 1,
        unit: 'sessions',
        inputMode: 'fixed_step',
        stepValue: 1,
        periodicity: 'daily',
        color: '#10b981',
        userId: demoUser._id
      }
    ])
    console.log('Created metrics')

    // Create metric entries
    const metricEntries = await MetricEntry.insertMany([
      {
        metricId: metrics[0]._id,
        value: 2,
        note: 'TypeScript basics',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        userId: demoUser._id
      },
      {
        metricId: metrics[0]._id,
        value: 3,
        note: 'Advanced TypeScript',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        userId: demoUser._id
      },
      {
        metricId: metrics[1]._id,
        value: 5.2,
        note: 'Morning run in the park',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        userId: demoUser._id
      },
      {
        metricId: metrics[2]._id,
        value: 1,
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        userId: demoUser._id
      }
    ])
    console.log('Created metric entries')

    // Create achievements
    await Achievement.insertMany([
      {
        type: 'task',
        title: 'First Task Completed',
        description: 'Completed your first task',
        value: 1,
        userId: demoUser._id
      },
      {
        type: 'habit',
        title: '3-Day Streak',
        description: 'Meditated for 3 days in a row',
        value: 3,
        userId: demoUser._id
      }
    ])
    console.log('Created achievements')

    console.log('\\nDatabase seeded successfully!')
    console.log('\\nDemo credentials:')
    console.log('Email: demo@example.com')
    console.log('Password: demo123')
    
    process.exit(0)
  } catch (error) {
    console.error('Seeding error:', error)
    process.exit(1)
  }
}

seedDatabase()
