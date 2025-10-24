-- ========================================
-- FIX DUPLICATE SERVICES IN DATABASE
-- ========================================
-- This script identifies and removes duplicate services
-- keeping only the first instance of each service

-- Step 1: Check for duplicates (run this first to see what duplicates exist)
SELECT 
  name,
  category_id,
  COUNT(*) as duplicate_count,
  array_agg(id) as duplicate_ids
FROM services
GROUP BY name, category_id
HAVING COUNT(*) > 1
ORDER BY name;

-- Step 2: Remove duplicates (keeps the OLDEST entry for each service)
-- This uses a CTE to identify duplicate IDs to delete
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY name, category_id 
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) as row_num
  FROM services
)
DELETE FROM services
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE row_num > 1
);

-- Step 3: Verify - this should return 0 rows if all duplicates are removed
SELECT 
  name,
  category_id,
  COUNT(*) as count
FROM services
GROUP BY name, category_id
HAVING COUNT(*) > 1;

-- Step 4: Add a unique constraint to prevent future duplicates
ALTER TABLE services
DROP CONSTRAINT IF EXISTS services_name_category_unique;

ALTER TABLE services
ADD CONSTRAINT services_name_category_unique 
UNIQUE (name, category_id);

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Total services count
SELECT COUNT(*) as total_services FROM services;

-- Services by category
SELECT 
  sc.name as category_name,
  COUNT(s.id) as service_count
FROM services s
JOIN service_categories sc ON s.category_id = sc.id
GROUP BY sc.name
ORDER BY sc.name;

