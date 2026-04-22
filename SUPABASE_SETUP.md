# Supabase Setup Instructions

## Required RLS Policies

Execute these SQL commands in Supabase Dashboard > SQL Editor:

### Users Table
```sql
-- For demo: Disable RLS on users table to allow app to create user records
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Alternative: Create permissive policies (uncomment if you want to use RLS)
-- DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
-- DROP POLICY IF EXISTS "Users can view their own profile" ON users;
-- DROP POLICY IF EXISTS "Users can update their own profile" ON users;
-- CREATE POLICY "Users can insert their own profile" ON users
--   FOR INSERT WITH CHECK (auth.uid() = id);
-- CREATE POLICY "Users can view their own profile" ON users
--   FOR SELECT USING (auth.uid() = id);
-- CREATE POLICY "Users can update their own profile" ON users
--   FOR UPDATE USING (auth.uid() = id);
```

### Goals Table
```sql
-- For demo: Disable RLS
ALTER TABLE goals DISABLE ROW LEVEL SECURITY;
```

### Tasks Table
```sql
-- For demo: Disable RLS
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
```

### Categories Table
```sql
-- For demo: Disable RLS
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
```

### Metrics Table
```sql
-- For demo: Disable RLS
ALTER TABLE metrics DISABLE ROW LEVEL SECURITY;
```

## Test Data Creation

After setting up policies, create some test data:

```sql
-- First, create the user record (skip if already exists)
INSERT INTO users (id, email, login, registration_date, settings) VALUES
('e52fa774-f595-459d-9136-c5592090e8fe', 'demo@example.com', 'demo', NOW(), '{"theme": "light", "language": "ru"}')
ON CONFLICT (id) DO NOTHING;

-- Then insert test categories
INSERT INTO categories (id, user_id, name, description, icon, color, is_default, order_index, goal_count, task_count) VALUES
(gen_random_uuid(), 'e52fa774-f595-459d-9136-c5592090e8fe', 'Personal', 'Personal goals', 'user', 'blue', true, 1, 0, 0),
(gen_random_uuid(), 'e52fa774-f595-459d-9136-c5592090e8fe', 'Work', 'Work goals', 'briefcase', 'green', true, 2, 0, 0);

-- Finally insert test goal
INSERT INTO goals (id, user_id, category_id, name, description, status, priority, progress_calculation, due_type, is_frozen, auto_calculate_status) VALUES
(gen_random_uuid(), 'e52fa774-f595-459d-9136-c5592090e8fe', (SELECT id FROM categories WHERE user_id = 'e52fa774-f595-459d-9136-c5592090e8fe' LIMIT 1), 'Test Goal', 'A test goal for demonstration', 'in_progress', 3, 'by_tasks', 'none', false, true);
```

## Environment Variables for Vercel

Make sure these are set in Vercel Dashboard:
```
VITE_SUPABASE_URL=https://hshufmajurttvuewqiwa.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

**Note:** Service role key should NOT be exposed to frontend - it's a security risk.

## Troubleshooting

1. **403 Forbidden**: Check RLS policies are correctly set - user must be able to insert their own profile
2. **406 Not Acceptable**: Usually means RLS blocked the query - verify `auth.uid() = id` policy
3. **No data loading**: Verify user exists in users table
4. **Auth issues**: Check environment variables are correct
5. **CORS errors**: Ensure Vercel domain is allowed in Supabase settings
