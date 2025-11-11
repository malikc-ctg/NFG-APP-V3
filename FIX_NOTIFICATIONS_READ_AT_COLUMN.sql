-- ============================================
-- Fix notifications table - Add read_at column
-- Run this in Supabase SQL Editor
-- ============================================

-- Check if read_at column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications'
AND column_name = 'read_at';

-- Add read_at column if it doesn't exist
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'notifications'
AND column_name = 'read_at';

-- Update existing read notifications to have read_at timestamp
-- (Only update notifications that are marked as read but don't have read_at)
UPDATE notifications
SET read_at = created_at
WHERE read = true 
AND read_at IS NULL;

-- Verify all columns in notifications table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

SELECT '✅ read_at column added to notifications table!' AS status;

