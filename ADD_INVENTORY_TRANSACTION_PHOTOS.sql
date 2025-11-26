-- Add photo support to inventory transactions
-- Phase 2.3: Photo Upload & Management

-- Add photo_urls column (JSON array of photo URLs)
ALTER TABLE inventory_transactions 
ADD COLUMN IF NOT EXISTS photo_urls JSONB DEFAULT '[]'::jsonb;

-- Create index for photo queries
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_photos 
ON inventory_transactions USING GIN (photo_urls);

-- Add comment
COMMENT ON COLUMN inventory_transactions.photo_urls IS 'Array of photo URLs stored in Supabase Storage for this transaction';

