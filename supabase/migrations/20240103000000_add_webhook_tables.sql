-- Add webhook support columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS uninstalled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create data deletion logs table for GDPR compliance
CREATE TABLE IF NOT EXISTS data_deletion_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  confirmation_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create webhook events table for tracking
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id TEXT,
  payload JSONB,
  processed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_webhook_events_user_id ON webhook_events(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_data_deletion_logs_confirmation_code ON data_deletion_logs(confirmation_code);

-- RLS policies for webhook tables
ALTER TABLE data_deletion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service role can access these tables (they contain sensitive webhook data)
CREATE POLICY "Service role access only - data_deletion_logs"
ON data_deletion_logs
FOR ALL
TO service_role
USING (true);

CREATE POLICY "Service role access only - webhook_events"
ON webhook_events
FOR ALL
TO service_role
USING (true); 