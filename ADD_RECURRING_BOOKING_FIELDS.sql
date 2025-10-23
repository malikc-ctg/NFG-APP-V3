-- ============================================
-- NFG: Add Recurring Booking Fields
-- This adds fields needed for automatic recurring booking creation
-- Run this ONCE in your Supabase SQL Editor
-- ============================================

-- Step 1: Add recurrence_pattern column (weekly, monthly, etc.)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT DEFAULT 'weekly'
CHECK (recurrence_pattern IN ('weekly', 'biweekly', 'monthly'));

-- Step 2: Add recurrence_series_id to link bookings in the same series
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS recurrence_series_id UUID;

-- Step 3: Add next_occurrence_date to track when the next booking should be created
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS next_occurrence_date DATE;

-- Step 4: Add is_recurring_template to mark the original recurring booking
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS is_recurring_template BOOLEAN DEFAULT FALSE;

-- Step 5: Add frequency column to match jobs (if not already present)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'single visit'
CHECK (frequency IN ('single visit', 'recurring'));

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_recurrence_series ON bookings(recurrence_series_id);
CREATE INDEX IF NOT EXISTS idx_bookings_frequency ON bookings(frequency);
CREATE INDEX IF NOT EXISTS idx_bookings_next_occurrence ON bookings(next_occurrence_date);

-- Step 7: Verify the schema changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'bookings' 
AND column_name IN ('recurrence_pattern', 'recurrence_series_id', 'next_occurrence_date', 'is_recurring_template', 'frequency')
ORDER BY column_name;

SELECT '✅ Recurring booking fields added successfully!' as result;
SELECT '🔄 Bookings can now automatically create next instances when their job is completed!' as next_step;

