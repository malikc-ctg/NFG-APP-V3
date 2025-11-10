-- ============================================
-- Fix notifications table - Add missing metadata column
-- ============================================

-- Check if metadata column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'notifications'
AND column_name = 'metadata';

-- Add metadata column if it doesn't exist
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Update existing rows to have empty metadata if NULL
UPDATE notifications
SET metadata = '{}'
WHERE metadata IS NULL;

-- Make sure the column has a default value
ALTER TABLE notifications
ALTER COLUMN metadata SET DEFAULT '{}';

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications'
AND column_name = 'metadata';

-- Verify all columns in notifications table
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

