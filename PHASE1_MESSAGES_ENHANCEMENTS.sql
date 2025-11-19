-- =====================================================
-- Phase 1: Core Enhancements for Messages
-- Features: Archive/Delete conversations, Presence tracking
-- =====================================================

-- ========== ADD ARCHIVE COLUMNS TO CONVERSATIONS ==========
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for archived conversations
CREATE INDEX IF NOT EXISTS idx_conversations_archived_at ON conversations(archived_at) WHERE archived_at IS NOT NULL;

-- ========== ADD PRESENCE TRACKING TO USER_PROFILES ==========
-- Add last_seen_at to user_profiles if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Index for last_seen_at
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_seen_at ON user_profiles(last_seen_at);

-- ========== FUNCTION TO UPDATE LAST_SEEN_AT ==========
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_seen_at when user authenticates or presence updates
  UPDATE user_profiles
  SET last_seen_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update last_seen_at on auth.users update (if possible)
-- Note: This might need to be handled in application code instead

-- ========== RLS POLICY FOR ARCHIVED CONVERSATIONS ==========
-- Users can see their own archived conversations
-- Archived conversations are filtered out by default in queries
-- (No new policy needed, just filter by archived_at IS NULL in queries)

-- ========== GRANTS ==========
GRANT UPDATE (archived_at, archived_by) ON conversations TO authenticated;
GRANT UPDATE (last_seen_at) ON user_profiles TO authenticated;

-- ========== HELPER FUNCTION TO CHECK IF CONVERSATION IS ARCHIVED ==========
CREATE OR REPLACE FUNCTION is_conversation_archived(conv_id UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM conversations
    WHERE id = conv_id
      AND archived_at IS NOT NULL
      AND archived_by = user_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_conversation_archived(UUID, UUID) TO authenticated;

-- ========== VERIFY CHANGES ==========
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'conversations'
  AND column_name IN ('archived_at', 'archived_by')
ORDER BY ordinal_position;

SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name = 'last_seen_at'
ORDER BY ordinal_position;

SELECT '✅ Phase 1 schema updates complete!' as result;

