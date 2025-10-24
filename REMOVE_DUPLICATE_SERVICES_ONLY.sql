-- ========================================
-- REMOVE DUPLICATE SERVICES (SIMPLE VERSION)
-- ========================================
-- This script only removes duplicates, since the unique constraint already exists
-- Run this if you got the error: duplicate key value violates unique constraint "services_name_category_unique"

-- ========================================
-- STEP 1: View duplicates first (optional - to see what will be deleted)
-- ========================================
SELECT 
  name,
  category_id,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY created_at ASC NULLS LAST) as all_ids,
  (array_agg(id ORDER BY created_at ASC NULLS LAST))[1] as id_to_keep,
  array_remove(array_agg(id ORDER BY created_at ASC NULLS LAST), (array_agg(id ORDER BY created_at ASC NULLS LAST))[1]) as ids_to_delete
FROM services
GROUP BY name, category_id
HAVING COUNT(*) > 1
ORDER BY name;

-- ========================================
-- STEP 2: Check if any bookings reference the duplicates
-- ========================================
-- This shows if any bookings are using the duplicate services
SELECT 
  bs.service_id,
  s.name,
  COUNT(*) as booking_count
FROM booking_services bs
JOIN services s ON s.id = bs.service_id
WHERE s.id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY name, category_id 
        ORDER BY created_at ASC NULLS LAST, id ASC
      ) as row_num
    FROM services
  ) duplicates
  WHERE row_num > 1
)
GROUP BY bs.service_id, s.name;

-- ========================================
-- STEP 3: Update booking_services to point to the kept service
-- ========================================
-- This ensures no data is lost - updates references before deletion
WITH duplicates AS (
  SELECT 
    id as duplicate_id,
    FIRST_VALUE(id) OVER (
      PARTITION BY name, category_id 
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) as keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY name, category_id 
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) as row_num
  FROM services
)
UPDATE booking_services
SET service_id = duplicates.keep_id
FROM duplicates
WHERE booking_services.service_id = duplicates.duplicate_id
  AND duplicates.row_num > 1;

-- ========================================
-- STEP 4: Now safely delete the duplicates
-- ========================================
-- This keeps only the OLDEST entry for each (name, category_id) pair
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

-- ========================================
-- STEP 5: Verify - should return 0 rows
-- ========================================
SELECT 
  name,
  category_id,
  COUNT(*) as count
FROM services
GROUP BY name, category_id
HAVING COUNT(*) > 1;

-- ========================================
-- STEP 6: Show final service count
-- ========================================
SELECT COUNT(*) as total_unique_services FROM services;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
-- If Step 5 returns 0 rows, duplicates are removed! ✅
-- The unique constraint will now work properly.

