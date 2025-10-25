-- Time Tracking System for Staff Clock In/Out
-- This tracks when staff members start and end their work shifts

-- Create time_entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  total_hours DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_clock_in ON time_entries(clock_in);
CREATE INDEX idx_time_entries_clock_out ON time_entries(clock_out);

-- Disable RLS (for simplicity, can be enabled later)
ALTER TABLE time_entries DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON time_entries TO authenticated;
GRANT ALL ON time_entries TO anon;
GRANT USAGE, SELECT ON SEQUENCE time_entries_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE time_entries_id_seq TO anon;

-- Function to calculate total hours
CREATE OR REPLACE FUNCTION calculate_total_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_out IS NOT NULL THEN
    NEW.total_hours := EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate hours on clock out
DROP TRIGGER IF EXISTS calculate_hours_on_update ON time_entries;
CREATE TRIGGER calculate_hours_on_update
  BEFORE UPDATE ON time_entries
  FOR EACH ROW
  WHEN (NEW.clock_out IS NOT NULL AND OLD.clock_out IS NULL)
  EXECUTE FUNCTION calculate_total_hours();

-- View today's entries for quick access
SELECT 
  te.id,
  te.user_id,
  up.full_name,
  te.clock_in,
  te.clock_out,
  te.total_hours,
  CASE 
    WHEN te.clock_out IS NULL THEN 'Clocked In'
    ELSE 'Clocked Out'
  END as status
FROM time_entries te
LEFT JOIN user_profiles up ON te.user_id = up.id
WHERE te.clock_in::date = CURRENT_DATE
ORDER BY te.clock_in DESC;

