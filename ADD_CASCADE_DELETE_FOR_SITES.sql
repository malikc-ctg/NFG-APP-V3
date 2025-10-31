-- ============================================
-- ADD CASCADE DELETE FOR SITE DELETIONS
-- When a site is deleted, automatically delete:
-- - All jobs for that site
-- - All bookings for that site
-- - All worker assignments for that site
-- - All inventory for that site
-- - All inventory transactions for that site
-- ============================================

-- Step 1: Drop existing foreign key constraints (if they exist)
-- ============================================

-- Jobs
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'jobs_site_id_fkey'
  ) THEN
    ALTER TABLE jobs DROP CONSTRAINT jobs_site_id_fkey;
    RAISE NOTICE 'Dropped existing jobs_site_id_fkey constraint';
  END IF;
END $$;

-- Bookings
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'bookings_site_id_fkey'
  ) THEN
    ALTER TABLE bookings DROP CONSTRAINT bookings_site_id_fkey;
    RAISE NOTICE 'Dropped existing bookings_site_id_fkey constraint';
  END IF;
END $$;

-- Worker Site Assignments
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'worker_site_assignments_site_id_fkey'
  ) THEN
    ALTER TABLE worker_site_assignments DROP CONSTRAINT worker_site_assignments_site_id_fkey;
    RAISE NOTICE 'Dropped existing worker_site_assignments_site_id_fkey constraint';
  END IF;
END $$;

-- Site Inventory
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'site_inventory_site_id_fkey'
  ) THEN
    ALTER TABLE site_inventory DROP CONSTRAINT site_inventory_site_id_fkey;
    RAISE NOTICE 'Dropped existing site_inventory_site_id_fkey constraint';
  END IF;
END $$;

-- Inventory Transactions
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'inventory_transactions_site_id_fkey'
  ) THEN
    ALTER TABLE inventory_transactions DROP CONSTRAINT inventory_transactions_site_id_fkey;
    RAISE NOTICE 'Dropped existing inventory_transactions_site_id_fkey constraint';
  END IF;
END $$;

-- Step 2: Add CASCADE DELETE foreign keys
-- ============================================

-- Jobs: Delete all jobs when site is deleted
ALTER TABLE jobs 
ADD CONSTRAINT jobs_site_id_fkey 
FOREIGN KEY (site_id) 
REFERENCES sites(id) 
ON DELETE CASCADE;

-- Bookings: Delete all bookings when site is deleted
ALTER TABLE bookings 
ADD CONSTRAINT bookings_site_id_fkey 
FOREIGN KEY (site_id) 
REFERENCES sites(id) 
ON DELETE CASCADE;

-- Worker Site Assignments: Delete all assignments when site is deleted
ALTER TABLE worker_site_assignments 
ADD CONSTRAINT worker_site_assignments_site_id_fkey 
FOREIGN KEY (site_id) 
REFERENCES sites(id) 
ON DELETE CASCADE;

-- Site Inventory: Delete all inventory when site is deleted
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'site_inventory') THEN
    ALTER TABLE site_inventory 
    ADD CONSTRAINT site_inventory_site_id_fkey 
    FOREIGN KEY (site_id) 
    REFERENCES sites(id) 
    ON DELETE CASCADE;
    RAISE NOTICE 'Added CASCADE DELETE for site_inventory';
  ELSE
    RAISE NOTICE 'site_inventory table does not exist, skipping';
  END IF;
END $$;

-- Inventory Transactions: Delete all transactions when site is deleted
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_transactions') THEN
    ALTER TABLE inventory_transactions 
    ADD CONSTRAINT inventory_transactions_site_id_fkey 
    FOREIGN KEY (site_id) 
    REFERENCES sites(id) 
    ON DELETE CASCADE;
    RAISE NOTICE 'Added CASCADE DELETE for inventory_transactions';
  ELSE
    RAISE NOTICE 'inventory_transactions table does not exist, skipping';
  END IF;
END $$;

-- Step 3: Verify constraints were added
-- ============================================
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'sites'
    AND ccu.column_name = 'id'
ORDER BY tc.table_name;

-- ============================================
-- DONE! Now when you delete a site:
-- ✅ All jobs for that site will be deleted
-- ✅ All bookings for that site will be deleted  
-- ✅ All worker assignments will be removed
-- ✅ All inventory will be deleted
-- ✅ All inventory transactions will be deleted
-- ============================================

