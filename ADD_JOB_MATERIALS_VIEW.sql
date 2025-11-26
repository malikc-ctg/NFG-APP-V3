-- Job Materials Used View
-- Phase 4: Job Cost Reports
-- Shows all materials used for each job with cost calculations

-- Drop view if exists
DROP VIEW IF EXISTS job_materials_used CASCADE;

-- Create view for job materials summary
CREATE OR REPLACE VIEW job_materials_used AS
SELECT 
  j.id as job_id,
  j.title as job_title,
  j.site_id,
  s.name as site_name,
  j.status as job_status,
  COUNT(DISTINCT it.item_id) as unique_items_used,
  SUM(ABS(it.quantity_change)) as total_quantity_used,
  SUM(
    ABS(it.quantity_change) * 
    COALESCE(
      si.unit_cost, 
      ii.average_cost, 
      ii.unit_cost, 
      0
    )
  ) as estimated_cost
FROM jobs j
LEFT JOIN inventory_transactions it ON it.job_id = j.id AND it.transaction_type = 'use'
LEFT JOIN inventory_items ii ON ii.id = it.item_id
LEFT JOIN site_inventory si ON si.item_id = it.item_id AND si.site_id = it.site_id
LEFT JOIN sites s ON s.id = j.site_id
GROUP BY j.id, j.title, j.site_id, s.name, j.status;

-- Grant permissions
GRANT SELECT ON job_materials_used TO authenticated;
GRANT SELECT ON job_materials_used TO anon;

-- Create detailed view for job materials (individual transactions)
DROP VIEW IF EXISTS job_materials_detailed CASCADE;

CREATE OR REPLACE VIEW job_materials_detailed AS
SELECT 
  it.id as transaction_id,
  it.job_id,
  j.title as job_title,
  it.item_id,
  ii.name as item_name,
  ii.unit,
  it.site_id,
  s.name as site_name,
  ABS(it.quantity_change) as quantity_used,
  it.quantity_before,
  it.quantity_after,
  COALESCE(
    si.unit_cost, 
    ii.average_cost, 
    ii.unit_cost, 
    0
  ) as unit_cost,
  ABS(it.quantity_change) * 
    COALESCE(
      si.unit_cost, 
      ii.average_cost, 
      ii.unit_cost, 
      0
    ) as total_cost,
  it.created_at as usage_date,
  it.notes,
  it.user_id,
  up.full_name as used_by,
  it.photo_urls
FROM inventory_transactions it
INNER JOIN jobs j ON j.id = it.job_id
INNER JOIN inventory_items ii ON ii.id = it.item_id
LEFT JOIN sites s ON s.id = it.site_id
LEFT JOIN site_inventory si ON si.item_id = it.item_id AND si.site_id = it.site_id
LEFT JOIN user_profiles up ON up.id = it.user_id
WHERE it.transaction_type = 'use'
  AND it.job_id IS NOT NULL
ORDER BY it.created_at DESC;

-- Grant permissions
GRANT SELECT ON job_materials_detailed TO authenticated;
GRANT SELECT ON job_materials_detailed TO anon;

-- Add comments
COMMENT ON VIEW job_materials_used IS 'Summary of materials used per job with total cost';
COMMENT ON VIEW job_materials_detailed IS 'Detailed list of all material usage transactions per job';

