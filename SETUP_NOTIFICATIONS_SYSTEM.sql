-- ==========================================
-- NFG Notifications System
-- Complete notification system with preferences
-- ==========================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'job_assigned', 'job_completed', 'job_updated', 'site_assigned', 'booking_created', 'booking_cancelled', 'mention', 'system'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500), -- URL to relevant page/item
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}', -- Store additional data (job_id, booking_id, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true, -- For future PWA push notifications
  in_app_enabled BOOLEAN DEFAULT true,
  
  -- Type-specific preferences
  job_assigned BOOLEAN DEFAULT true,
  job_completed BOOLEAN DEFAULT true,
  job_updated BOOLEAN DEFAULT true,
  site_assigned BOOLEAN DEFAULT true,
  booking_created BOOLEAN DEFAULT true,
  booking_updated BOOLEAN DEFAULT true,
  booking_cancelled BOOLEAN DEFAULT true,
  mention BOOLEAN DEFAULT true,
  system BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true); -- Allow system/service role to create

DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for notification_preferences
DROP POLICY IF EXISTS "Users can view their own preferences" ON notification_preferences;
CREATE POLICY "Users can view their own preferences"
  ON notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON notification_preferences;
CREATE POLICY "Users can update their own preferences"
  ON notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own preferences" ON notification_preferences;
CREATE POLICY "Users can insert their own preferences"
  ON notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET read = true, read_at = NOW()
  WHERE id = notification_id AND user_id = auth.uid();
END;
$$;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET read = true, read_at = NOW()
  WHERE user_id = auth.uid() AND read = false;
END;
$$;

-- Function to get unread count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*) INTO count
  FROM notifications
  WHERE user_id = auth.uid() AND read = false;
  RETURN count;
END;
$$;

-- Trigger to update notification_preferences updated_at
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notification_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count() TO authenticated;

-- Create default preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE notifications IS 'Stores all in-app notifications for users';
COMMENT ON TABLE notification_preferences IS 'User preferences for notification types and delivery methods';

SELECT '✅ Notifications System Setup Complete!' AS status;

