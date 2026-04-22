# Supabase Setup Instructions

## Required RLS Policies

Execute these SQL commands in Supabase Dashboard > SQL Editor:

### Users Table
```sql
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Create new policies
CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id);

CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id);
```

### Goals Table
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own goals" ON goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON goals;

-- Create new policies
CREATE POLICY "Users can view their own goals" ON goals
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own goals" ON goals
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own goals" ON goals
  FOR UPDATE USING (auth.uid()::text = user_id);
```

### Tasks Table
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;

-- Create new policies
CREATE POLICY "Users can view their own tasks" ON tasks
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own tasks" ON tasks
  FOR UPDATE USING (auth.uid()::text = user_id);
```

### Categories Table
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert their own categories" ON categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON categories;

-- Create new policies
CREATE POLICY "Users can view their own categories" ON categories
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own categories" ON categories
  FOR UPDATE USING (auth.uid()::text = user_id);
```

### Metrics Table
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own metrics" ON metrics;
DROP POLICY IF EXISTS "Users can insert their own metrics" ON metrics;
DROP POLICY IF EXISTS "Users can update their own metrics" ON metrics;

-- Create new policies
CREATE POLICY "Users can view their own metrics" ON metrics
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own metrics" ON metrics
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own metrics" ON metrics
  FOR UPDATE USING (auth.uid()::text = user_id);
```

## Test Data Creation

After setting up policies, create some test data:

```sql
-- Insert test categories
INSERT INTO categories (id, user_id, name, description, icon, color, is_default, order_index, goal_count, task_count) VALUES
(gen_random_uuid()::text, 'e52fa774-f595-459d-9136-c5592090e8fe', 'Personal', 'Personal goals', 'user', 'blue', true, 1, 0, 0),
(gen_random_uuid()::text, 'e52fa774-f595-459d-9136-c5592090e8fe', 'Work', 'Work goals', 'briefcase', 'green', true, 2, 0, 0);

-- Insert test goal
INSERT INTO goals (id, user_id, category_id, name, description, status, priority, progress_calculation, due_type, is_frozen, auto_calculate_status) VALUES
(gen_random_uuid()::text, 'e52fa774-f595-459d-9136-c5592090e8fe', (SELECT id FROM categories WHERE user_id = 'e52fa774-f595-459d-9136-c5592090e8fe' LIMIT 1), 'Test Goal', 'A test goal for demonstration', 'in_progress', 3, 'by_tasks', 'none', false, true);
```

## Environment Variables for Vercel

Make sure these are set in Vercel Dashboard:
```
VITE_SUPABASE_URL=https://hshufmajurttvuewqiwa.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Troubleshooting

1. **403 Forbidden**: Check RLS policies are correctly set
2. **No data loading**: Verify user exists in users table
3. **Auth issues**: Check environment variables are correct
4. **CORS errors**: Ensure Vercel domain is allowed in Supabase settings
