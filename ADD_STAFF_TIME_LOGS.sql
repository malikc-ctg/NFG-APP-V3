-- ============================================
-- CREATE STAFF TIME LOGS TABLE
-- For individual time tracking entries
-- Run this in Supabase SQL Editor
-- ============================================

-- Create staff_time_logs table for individual time tracking
CREATE TABLE IF NOT EXISTS staff_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  total_duration INTEGER, -- seconds
  is_overtime BOOLEAN DEFAULT FALSE,
  notes TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_time_logs_user_id ON staff_time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_time_logs_job_id ON staff_time_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_staff_time_logs_clock_in ON staff_time_logs(clock_in);
CREATE INDEX IF NOT EXISTS idx_staff_time_logs_status ON staff_time_logs(status);
CREATE INDEX IF NOT EXISTS idx_staff_time_logs_user_clock ON staff_time_logs(user_id, clock_in DESC);

-- RLS Policies (optional - can enable later if needed)
-- ALTER TABLE staff_time_logs ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON staff_time_logs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE IF EXISTS staff_time_logs_id_seq TO authenticated;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_staff_time_logs_updated_at
BEFORE UPDATE ON staff_time_logs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Verify table was created
SELECT 'staff_time_logs table created successfully!' AS status;

