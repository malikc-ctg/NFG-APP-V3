-- Add profile_picture column to user_profiles table
-- Run this in Supabase SQL Editor

-- Add the column if it doesn't exist
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_picture ON user_profiles(profile_picture);

SELECT '✅ profile_picture column added to user_profiles table!' as result;

