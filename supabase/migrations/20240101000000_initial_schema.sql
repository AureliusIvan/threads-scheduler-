-- Enable Row Level Security
ALTER DATABASE postgres SET row_security = on;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE post_status AS ENUM ('draft', 'scheduled', 'published', 'failed');
CREATE TYPE media_type AS ENUM ('text', 'image', 'video', 'carousel');

-- Users table
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    meta_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    username TEXT,
    profile_picture_url TEXT,
    access_token TEXT, -- encrypted
    refresh_token TEXT, -- encrypted
    token_expires_at TIMESTAMPTZ,
    threads_user_id TEXT,
    is_active BOOLEAN DEFAULT true,
    subscription_tier TEXT DEFAULT 'free',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts table
CREATE TABLE posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_urls TEXT[], -- Array of media URLs
    media_type media_type DEFAULT 'text',
    scheduled_for TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    threads_media_id TEXT, -- ID from Threads API
    status post_status DEFAULT 'draft',
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    tags TEXT[],
    link_attachment_url TEXT,
    character_count INTEGER DEFAULT 0,
    is_carousel BOOLEAN DEFAULT false,
    carousel_items JSONB, -- For carousel posts
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics table
CREATE TABLE analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    likes INTEGER DEFAULT 0,
    replies INTEGER DEFAULT 0,
    reposts INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,4),
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post queue table for scheduling
CREATE TABLE post_queue (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMPTZ NOT NULL,
    priority INTEGER DEFAULT 1,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings table
CREATE TABLE user_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    timezone TEXT DEFAULT 'UTC',
    auto_save_enabled BOOLEAN DEFAULT true,
    auto_save_interval INTEGER DEFAULT 30, -- seconds
    default_privacy TEXT DEFAULT 'public',
    notification_preferences JSONB DEFAULT '{}',
    posting_schedule JSONB DEFAULT '{}', -- Best times to post
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media uploads table
CREATE TABLE media_uploads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_filename TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    storage_path TEXT NOT NULL,
    public_url TEXT,
    upload_status TEXT DEFAULT 'uploading', -- uploading, completed, failed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limiting table
CREATE TABLE rate_limits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    requests_count INTEGER DEFAULT 0,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    reset_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log table
CREATE TABLE audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_meta_id ON users(meta_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_scheduled_for ON posts(scheduled_for);
CREATE INDEX idx_posts_created_at ON posts(created_at);
CREATE INDEX idx_analytics_post_id ON analytics(post_id);
CREATE INDEX idx_analytics_user_id ON analytics(user_id);
CREATE INDEX idx_analytics_timestamp ON analytics(timestamp);
CREATE INDEX idx_post_queue_scheduled_for ON post_queue(scheduled_for);
CREATE INDEX idx_post_queue_status ON post_queue(status);
CREATE INDEX idx_rate_limits_user_endpoint ON rate_limits(user_id, endpoint);
CREATE INDEX idx_rate_limits_window_start ON rate_limits(window_start);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_queue_updated_at BEFORE UPDATE ON post_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid()::text = meta_id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid()::text = meta_id);

-- Posts policies
CREATE POLICY "Users can view own posts" ON posts FOR SELECT USING (user_id IN (SELECT id FROM users WHERE meta_id = auth.uid()::text));
CREATE POLICY "Users can insert own posts" ON posts FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE meta_id = auth.uid()::text));
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE meta_id = auth.uid()::text));
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (user_id IN (SELECT id FROM users WHERE meta_id = auth.uid()::text));

-- Analytics policies
CREATE POLICY "Users can view own analytics" ON analytics FOR SELECT USING (user_id IN (SELECT id FROM users WHERE meta_id = auth.uid()::text));
CREATE POLICY "System can insert analytics" ON analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update analytics" ON analytics FOR UPDATE WITH CHECK (true);

-- Post queue policies
CREATE POLICY "Users can view own queue" ON post_queue FOR SELECT USING (user_id IN (SELECT id FROM users WHERE meta_id = auth.uid()::text));
CREATE POLICY "System can manage queue" ON post_queue FOR ALL WITH CHECK (true);

-- User settings policies
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (user_id IN (SELECT id FROM users WHERE meta_id = auth.uid()::text));
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE meta_id = auth.uid()::text));
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE meta_id = auth.uid()::text));

-- Media uploads policies
CREATE POLICY "Users can view own uploads" ON media_uploads FOR SELECT USING (user_id IN (SELECT id FROM users WHERE meta_id = auth.uid()::text));
CREATE POLICY "Users can insert own uploads" ON media_uploads FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE meta_id = auth.uid()::text));

-- Rate limits policies (system managed)
CREATE POLICY "System can manage rate limits" ON rate_limits FOR ALL WITH CHECK (true);

-- Create storage bucket for media uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('media-uploads', 'media-uploads', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload media" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'media-uploads' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view own media" ON storage.objects FOR SELECT
    USING (bucket_id = 'media-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own media" ON storage.objects FOR DELETE
    USING (bucket_id = 'media-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create functions for common operations
CREATE OR REPLACE FUNCTION get_user_by_meta_id(meta_user_id TEXT)
RETURNS TABLE(
    id UUID,
    meta_id TEXT,
    email TEXT,
    name TEXT,
    username TEXT,
    profile_picture_url TEXT,
    threads_user_id TEXT,
    is_active BOOLEAN,
    subscription_tier TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY 
    SELECT u.id, u.meta_id, u.email, u.name, u.username, u.profile_picture_url, 
           u.threads_user_id, u.is_active, u.subscription_tier, u.created_at, u.updated_at
    FROM users u
    WHERE u.meta_id = meta_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get posts ready for publishing
CREATE OR REPLACE FUNCTION get_posts_ready_for_publishing()
RETURNS TABLE(
    id UUID,
    user_id UUID,
    content TEXT,
    media_urls TEXT[],
    media_type media_type,
    scheduled_for TIMESTAMPTZ,
    threads_media_id TEXT,
    tags TEXT[],
    link_attachment_url TEXT,
    is_carousel BOOLEAN,
    carousel_items JSONB
) AS $$
BEGIN
    RETURN QUERY 
    SELECT p.id, p.user_id, p.content, p.media_urls, p.media_type, 
           p.scheduled_for, p.threads_media_id, p.tags, p.link_attachment_url,
           p.is_carousel, p.carousel_items
    FROM posts p
    WHERE p.status = 'scheduled' 
      AND p.scheduled_for <= NOW()
      AND p.retry_count < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update post analytics
CREATE OR REPLACE FUNCTION update_post_analytics(
    p_post_id UUID,
    p_likes INTEGER DEFAULT NULL,
    p_replies INTEGER DEFAULT NULL,
    p_reposts INTEGER DEFAULT NULL,
    p_views INTEGER DEFAULT NULL,
    p_reach INTEGER DEFAULT NULL,
    p_impressions INTEGER DEFAULT NULL,
    p_clicks INTEGER DEFAULT NULL,
    p_saves INTEGER DEFAULT NULL,
    p_shares INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_engagement_rate DECIMAL(5,4);
BEGIN
    -- Get user_id for the post
    SELECT user_id INTO v_user_id FROM posts WHERE id = p_post_id;
    
    -- Calculate engagement rate if we have impressions
    IF p_impressions > 0 THEN
        v_engagement_rate := (COALESCE(p_likes, 0) + COALESCE(p_replies, 0) + COALESCE(p_reposts, 0) + COALESCE(p_shares, 0))::DECIMAL / p_impressions;
    END IF;
    
    -- Insert or update analytics
    INSERT INTO analytics (
        post_id, user_id, likes, replies, reposts, views, reach, 
        impressions, clicks, saves, shares, engagement_rate
    ) VALUES (
        p_post_id, v_user_id, p_likes, p_replies, p_reposts, p_views, 
        p_reach, p_impressions, p_clicks, p_saves, p_shares, v_engagement_rate
    )
    ON CONFLICT (post_id, timestamp::date) DO UPDATE SET
        likes = COALESCE(p_likes, analytics.likes),
        replies = COALESCE(p_replies, analytics.replies),
        reposts = COALESCE(p_reposts, analytics.reposts),
        views = COALESCE(p_views, analytics.views),
        reach = COALESCE(p_reach, analytics.reach),
        impressions = COALESCE(p_impressions, analytics.impressions),
        clicks = COALESCE(p_clicks, analytics.clicks),
        saves = COALESCE(p_saves, analytics.saves),
        shares = COALESCE(p_shares, analytics.shares),
        engagement_rate = COALESCE(v_engagement_rate, analytics.engagement_rate);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 