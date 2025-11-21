-- =====================================================
-- Phase 4: Group Conversations - Database Enhancements
-- Optional: Add description column for group conversations
-- =====================================================

-- Add description column to conversations table (optional)
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN conversations.description IS 'Optional description for group conversations';

-- Note: The conversations table already has:
-- - type VARCHAR(20) CHECK (type IN ('direct', 'job', 'group')) ✅
-- - title VARCHAR(255) -- For group names ✅
-- - conversation_participants table with role column ('participant', 'admin') ✅
-- 
-- So group conversations are already fully supported in the schema!
-- This script only adds an optional description field.

