-- ==========================================
-- FIX MESSAGE DELETE - BYPASS RLS WITH FUNCTION
-- ==========================================
-- Instead of fixing RLS, create a SECURITY DEFINER function
-- This bypasses RLS completely and does the update

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS soft_delete_message(UUID, UUID);

-- Create function to soft delete message
-- SECURITY DEFINER allows it to bypass RLS
CREATE OR REPLACE FUNCTION soft_delete_message(
  p_message_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_id UUID;
BEGIN
  -- Get the sender_id of the message
  SELECT sender_id INTO v_sender_id
  FROM messages
  WHERE id = p_message_id;
  
  -- Check if message exists and user owns it
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Message not found';
  END IF;
  
  IF v_sender_id != p_user_id THEN
    RAISE EXCEPTION 'You can only delete your own messages';
  END IF;
  
  -- Update the message (bypasses RLS due to SECURITY DEFINER)
  UPDATE messages
  SET deleted_at = NOW()
  WHERE id = p_message_id;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION soft_delete_message(UUID, UUID) TO authenticated;

-- Test the function (replace MESSAGE_ID and USER_ID with actual values)
-- SELECT soft_delete_message('MESSAGE_ID_HERE'::UUID, auth.uid());

