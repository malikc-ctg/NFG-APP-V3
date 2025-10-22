-- ============================================
-- Simple Bookings Table
-- Just one table to get started
-- ============================================

-- Drop old bookings table if it exists
DROP TABLE IF EXISTS bookings CASCADE;

-- Create simple bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  site_id BIGINT REFERENCES sites(id) ON DELETE SET NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NO RLS for now - keep it simple
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_bookings_client ON bookings(client_id);
CREATE INDEX idx_bookings_site ON bookings(site_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(scheduled_date);

-- Verify
SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'bookings'
ORDER BY ordinal_position;

SELECT '✅ Simple bookings table created!' as result;
SELECT '🔓 RLS disabled for easy testing' as security;
SELECT '🔄 Now refresh your bookings page!' as next_step;

