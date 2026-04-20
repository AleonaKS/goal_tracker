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

// Data from dataStore.ts
const defaultCategories = [
  { name: 'Professional', icon: 'Briefcase', color: '#3b82f6', isDefault: true },
  { name: 'Finance', icon: 'DollarSign', color: '#10b981', isDefault: true },
  { name: 'Reading', icon: 'BookOpen', color: '#8b5cf6', isDefault: true },
  { name: 'Health', icon: 'Heart', color: '#ef4444', isDefault: true },
  { name: 'Languages', icon: 'Globe', color: '#f59e0b', isDefault: true },
  { name: 'Hobbies', icon: 'Palette', color: '#ec4899', isDefault: true },
  { name: 'Personal', icon: 'User', color: '#6b7280', isDefault: true },
]

const demoGoals = [
  {
    name: 'Find a Job',
    description: 'Find dream job in IT sector',
    deadlineType: 'specific_date',
    deadlineValue: new Date('2024-06-30'),
    status: 'in_progress',
    priority: 5,
    progressCalculation: 'by_tasks',
  },
  {
    name: 'Save for Vacation',
    description: 'Save 150,000 rubles for vacation',
    deadlineType: 'month_year',
    deadlineValue: '2024-08',
    status: 'in_progress',
    priority: 4,
    progressCalculation: 'by_metric',
  },
  {
    name: 'Read 12 Books',
    description: 'Read one book per month',
    deadlineType: 'year',
    deadlineValue: '2024',
    status: 'in_progress',
    priority: 3,
    progressCalculation: 'by_metric',
  },
]

const demoStages = [
  { name: 'Preparation', startDate: new Date('2024-01-01'), endDate: new Date('2024-02-01') },
  { name: 'Search', startDate: new Date('2024-02-01'), endDate: new Date('2024-04-01') },
]

const demoTasks = [
  { name: 'Update Portfolio', stageId: 'stage-1', isPeriodBased: false, priority: 5, complexity: 3, weight: 1, completed: true, subtasks: [] },
  { name: 'Prepare Resume', stageId: 'stage-1', isPeriodBased: false, priority: 5, complexity: 2, weight: 1, completed: true, subtasks: [] },
  { name: 'Register on LinkedIn', stageId: 'stage-2', isPeriodBased: false, priority: 4, complexity: 1, weight: 1, completed: false, subtasks: [] },
  { name: 'Apply to 10 Jobs', stageId: 'stage-2', isPeriodBased: false, priority: 5, complexity: 2, weight: 1, completed: false, subtasks: [] },
]

const demoMetrics = [
  {
    name: 'Savings',
    type: 'counter',
    description: 'Save money for vacation',
    initialValue: 0,
    targetValue: 150000,
    unit: 'rub',
    inputMode: 'manual',
    periodicity: 'monthly',
    color: '#10b981',
  },
  {
    name: 'Books Read',
    type: 'counter',
    description: 'Number of books read',
    initialValue: 0,
    targetValue: 12,
    unit: 'books',
    inputMode: 'fixed_step',
    stepValue: 1,
    periodicity: 'monthly',
    color: '#8b5cf6',
  },
  {
    name: 'Reading',
    type: 'habit',
    description: 'Read 30 pages every day',
    initialValue: 0,
    targetValue: 30,
    unit: 'pages',
    inputMode: 'fixed_step',
    stepValue: 30,
    periodicity: 'daily',
    color: '#f59e0b',
  },
]

const demoMetricEntries = [
  { value: 5000, finalValue: 5000, note: 'First deposit', timestamp: new Date('2024-01-01'), isAddition: true },
  { value: 10000, finalValue: 15000, note: 'Bonus', timestamp: new Date('2024-01-15'), isAddition: true },
  { value: 1, finalValue: 1, note: '1984', timestamp: new Date('2024-01-01'), isAddition: true },
  { value: 1, finalValue: 2, note: 'The Little Prince', timestamp: new Date('2024-01-10'), isAddition: true },
  { value: 1, finalValue: 3, note: 'Alice in Wonderland', timestamp: new Date('2024-01-20'), isAddition: true },
  { value: 1, finalValue: 1, note: 'Morning run', timestamp: new Date('2024-01-01'), isAddition: true },
  { value: 1, finalValue: 2, note: 'Evening workout', timestamp: new Date('2024-01-02'), isAddition: true },
  { value: 1, finalValue: 3, note: 'Park run', timestamp: new Date('2024-01-03'), isAddition: true },
]

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

    // Create categories from dataStore
    const categories = await Category.insertMany(
      defaultCategories.map(cat => ({
        ...cat,
        userId: demoUser._id
      }))
    )
    console.log('Created categories from dataStore')

    // Create goals from dataStore
    const goals = await Goal.insertMany(
      demoGoals.map((goal, index) => ({
        ...goal,
        categoryId: categories[index % categories.length]._id,
        userId: demoUser._id
      }))
    )
    console.log('Created goals from dataStore')

    // Create stages from dataStore
    const stages = await Stage.insertMany(
      demoStages.map((stage, index) => ({
        ...stage,
        goalId: goals[0]._id, // All stages for first goal
        userId: demoUser._id
      }))
    )
    console.log('Created stages from dataStore')

    // Create tasks from dataStore
    const tasks = await Task.insertMany(
      demoTasks.map((task, index) => ({
        ...task,
        goalId: goals[0]._id,
        categoryId: categories[0]._id,
        stageId: task.stageId === 'stage-1' ? stages[0]._id : stages[1]._id,
        userId: demoUser._id
      }))
    )
    console.log('Created tasks from dataStore')

    // Create metrics from dataStore
    const metrics = await Metric.insertMany(
      demoMetrics.map((metric, index) => ({
        ...metric,
        goalId: goals[index + 1]?._id || null, // Skip first goal
        userId: demoUser._id
      }))
    )
    console.log('Created metrics from dataStore')

    // Create metric entries from dataStore
    await MetricEntry.insertMany(
      demoMetricEntries.map((entry, index) => ({
        ...entry,
        metricId: metrics[index % metrics.length]._id,
        userId: demoUser._id
      }))
    )
    console.log('Created metric entries from dataStore')

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

    console.log('\\nDatabase seeded successfully with dataStore data!')
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
