-- Add Threads API authentication fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS threads_user_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS threads_access_token TEXT,
ADD COLUMN IF NOT EXISTS threads_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_threads_user_id ON users(threads_user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Update RLS policies for threads authentication
CREATE POLICY "Users can read own data via threads_user_id"
ON users FOR SELECT
USING (
  threads_user_id = current_setting('request.jwt.claims', true)::json->>'threads_user_id'
  OR auth.uid()::text = id::text
);

CREATE POLICY "Users can update own data via threads_user_id"
ON users FOR UPDATE
USING (
  threads_user_id = current_setting('request.jwt.claims', true)::json->>'threads_user_id'
  OR auth.uid()::text = id::text
);

-- Create a function to get user by threads_user_id
CREATE OR REPLACE FUNCTION get_user_by_threads_id(threads_id TEXT)
RETURNS TABLE(
  id UUID,
  threads_user_id TEXT,
  username TEXT,
  display_name TEXT,
  threads_access_token TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.threads_user_id,
    u.username,
    u.display_name,
    u.threads_access_token,
    u.created_at,
    u.updated_at
  FROM users u
  WHERE u.threads_user_id = threads_id;
END;
$$; 