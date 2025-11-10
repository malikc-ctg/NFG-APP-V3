-- ============================================
-- Fix notification_preferences table schema
-- Adds missing site_assigned column
-- ============================================

-- Add missing site_assigned column if it doesn't exist
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS site_assigned BOOLEAN DEFAULT true;

-- Verify the column was added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'notification_preferences'
AND column_name = 'site_assigned';

-- Update existing rows to have site_assigned = true by default
UPDATE notification_preferences
SET site_assigned = true
WHERE site_assigned IS NULL;

-- Make sure the column is NOT NULL
ALTER TABLE notification_preferences
ALTER COLUMN site_assigned SET NOT NULL,
ALTER COLUMN site_assigned SET DEFAULT true;

-- Verify all columns exist
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'notification_preferences'
ORDER BY ordinal_position;

