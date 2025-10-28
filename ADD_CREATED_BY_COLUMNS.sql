-- ==========================================
-- ADD created_by COLUMNS TO ALL TABLES
-- This is CRITICAL for multi-tenancy!
-- ==========================================

-- 1. Add created_by to sites table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sites' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE sites 
    ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_sites_created_by ON sites(created_by);
    
    RAISE NOTICE 'Added created_by column to sites table';
  END IF;
END $$;

-- 2. Add created_by to jobs table  
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE jobs 
    ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs(created_by);
    
    RAISE NOTICE 'Added created_by column to jobs table';
  END IF;
END $$;

-- 3. Add created_by to bookings table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE bookings 
    ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_bookings_created_by ON bookings(created_by);
    
    RAISE NOTICE 'Added created_by column to bookings table';
  END IF;
END $$;

-- 4. Update RLS policies to use created_by for sites
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON sites;
CREATE POLICY "Enable insert for authenticated users" ON sites
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND
  created_by = auth.uid()
);

DROP POLICY IF EXISTS "Enable select for own sites" ON sites;
CREATE POLICY "Enable select for own sites" ON sites
FOR SELECT USING (
  created_by = auth.uid()
  OR
  EXISTS (SELECT 1 FROM worker_site_assignments WHERE worker_id = auth.uid() AND site_id = sites.id)
);

-- 5. Update RLS policies for jobs
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON jobs;
CREATE POLICY "Enable insert for authenticated users" ON jobs
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND
  created_by = auth.uid()
);

DROP POLICY IF EXISTS "Enable select for own jobs" ON jobs;
CREATE POLICY "Enable select for own jobs" ON jobs
FOR SELECT USING (
  created_by = auth.uid()
  OR
  assigned_worker_id = auth.uid()
);

-- 6. Update RLS policies for bookings
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON bookings;
CREATE POLICY "Enable insert for authenticated users" ON bookings
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND
  created_by = auth.uid()
);

DROP POLICY IF EXISTS "Enable select for own bookings" ON bookings;
CREATE POLICY "Enable select for own bookings" ON bookings
FOR SELECT USING (
  created_by = auth.uid()
);

-- ==========================================
-- CRITICAL: YOU MUST RUN THIS NOW!
-- ==========================================
-- After running this, all NEW sites/jobs/bookings will be
-- automatically isolated by user via created_by column

