-- ============================================
-- Phase 1: Add Service Tables (No Pricing)
-- Creates service categories and services catalog
-- ============================================

-- Step 1: Create service_categories table
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create services table (NO PRICING)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES service_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  estimated_duration INT, -- in minutes (optional)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Add job_id to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS job_id UUID;

-- Step 4: Create booking_services junction table
CREATE TABLE IF NOT EXISTS booking_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  quantity INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id, service_id)
);

-- Disable RLS on new tables
ALTER TABLE service_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE booking_services DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON service_categories TO authenticated, anon;
GRANT ALL ON services TO authenticated, anon;
GRANT ALL ON booking_services TO authenticated, anon;

-- Step 5: Insert 9 service categories
INSERT INTO service_categories (name, description, icon, display_order) VALUES
  ('Commercial & Office Cleaning', 'Corporate offices, buildings, small businesses, coworking spaces', 'building-2', 1),
  ('Floor Care & Maintenance', 'Floor stripping, waxing, polishing, and restoration', 'layers', 2),
  ('Post-Construction & Renovation Cleaning', 'Heavy debris removal and final deep cleaning', 'hammer', 3),
  ('Industrial & Warehouse Cleaning', 'Manufacturing, logistics, and production facilities', 'warehouse', 4),
  ('Specialty Cleaning & Sanitation', 'Healthcare, education, gyms, restaurants', 'shield-check', 5),
  ('Facility Maintenance & Handyman Support', 'Property management and maintenance', 'wrench', 6),
  ('Exterior & Building Services', 'Building exteriors, façades, and grounds', 'home', 7),
  ('Grounds & Seasonal Services', 'Landscaping, snow removal, seasonal maintenance', 'trees', 8),
  ('Event, Property & Specialty Support', 'Event venues, property management, emergency services', 'calendar-check', 9)
ON CONFLICT (name) DO NOTHING;

-- Step 6: Insert services (91 total)

-- Category 1: Commercial & Office Cleaning (14 services)
INSERT INTO services (category_id, name, estimated_duration) 
SELECT id, 'Office Cleaning (Daily)', 120 FROM service_categories WHERE name = 'Commercial & Office Cleaning'
UNION ALL SELECT id, 'Office Cleaning (Weekly)', 180 FROM service_categories WHERE name = 'Commercial & Office Cleaning'
UNION ALL SELECT id, 'Restroom Sanitizing & Deep Cleaning', 60 FROM service_categories WHERE name = 'Commercial & Office Cleaning'
UNION ALL SELECT id, 'Kitchen & Lunchroom Cleaning', 45 FROM service_categories WHERE name = 'Commercial & Office Cleaning'
UNION ALL SELECT id, 'Garbage & Recycling Removal', 30 FROM service_categories WHERE name = 'Commercial & Office Cleaning'
UNION ALL SELECT id, 'Touch-Point Disinfecting', 30 FROM service_categories WHERE name = 'Commercial & Office Cleaning'
UNION ALL SELECT id, 'Desk & Equipment Wipe-Down', 45 FROM service_categories WHERE name = 'Commercial & Office Cleaning'
UNION ALL SELECT id, 'Spot Cleaning (Walls, Doors, Glass)', 60 FROM service_categories WHERE name = 'Commercial & Office Cleaning'
UNION ALL SELECT id, 'High Dusting (Vents, Ledges, Fixtures)', 90 FROM service_categories WHERE name = 'Commercial & Office Cleaning'
UNION ALL SELECT id, 'Carpet, Rug & Upholstery Cleaning', 120 FROM service_categories WHERE name = 'Commercial & Office Cleaning'
UNION ALL SELECT id, 'Interior & Exterior Window Cleaning', 90 FROM service_categories WHERE name = 'Commercial & Office Cleaning'
UNION ALL SELECT id, 'Elevator Cab & Track Cleaning', 45 FROM service_categories WHERE name = 'Commercial & Office Cleaning'
UNION ALL SELECT id, 'Entrance Detailing & Glass Polishing', 30 FROM service_categories WHERE name = 'Commercial & Office Cleaning'
UNION ALL SELECT id, 'Janitorial Inspections & Quality Audits', 60 FROM service_categories WHERE name = 'Commercial & Office Cleaning';

-- Category 2: Floor Care & Maintenance (8 services)
INSERT INTO services (category_id, name, estimated_duration)
SELECT id, 'Floor Stripping, Waxing & Sealing', 240 FROM service_categories WHERE name = 'Floor Care & Maintenance'
UNION ALL SELECT id, 'Floor Burnishing & Polishing', 120 FROM service_categories WHERE name = 'Floor Care & Maintenance'
UNION ALL SELECT id, 'Tile & Grout Cleaning & Sealing', 180 FROM service_categories WHERE name = 'Floor Care & Maintenance'
UNION ALL SELECT id, 'Vinyl, VCT, Linoleum Floor Restoration', 180 FROM service_categories WHERE name = 'Floor Care & Maintenance'
UNION ALL SELECT id, 'Concrete Floor Scrubbing & Polishing', 180 FROM service_categories WHERE name = 'Floor Care & Maintenance'
UNION ALL SELECT id, 'Stone & Marble Floor Polishing', 150 FROM service_categories WHERE name = 'Floor Care & Maintenance'
UNION ALL SELECT id, 'Anti-Slip Floor Treatments', 90 FROM service_categories WHERE name = 'Floor Care & Maintenance'
UNION ALL SELECT id, 'Mat & Runner Extraction & Sanitization', 60 FROM service_categories WHERE name = 'Floor Care & Maintenance';

-- Category 3: Post-Construction & Renovation Cleaning (5 services)
INSERT INTO services (category_id, name, estimated_duration)
SELECT id, 'Heavy Debris & Dust Removal', 240 FROM service_categories WHERE name = 'Post-Construction & Renovation Cleaning'
UNION ALL SELECT id, 'Adhesive, Tape & Paint Residue Removal', 120 FROM service_categories WHERE name = 'Post-Construction & Renovation Cleaning'
UNION ALL SELECT id, 'Window Sticker Removal & Polishing', 90 FROM service_categories WHERE name = 'Post-Construction & Renovation Cleaning'
UNION ALL SELECT id, 'Vent & Baseboard Detailing', 60 FROM service_categories WHERE name = 'Post-Construction & Renovation Cleaning'
UNION ALL SELECT id, 'Final Deep Cleaning (Pre-Occupancy)', 300 FROM service_categories WHERE name = 'Post-Construction & Renovation Cleaning';

-- Category 4: Industrial & Warehouse Cleaning (9 services)
INSERT INTO services (category_id, name, estimated_duration)
SELECT id, 'Ride-On Floor Scrubber Cleaning', 180 FROM service_categories WHERE name = 'Industrial & Warehouse Cleaning'
UNION ALL SELECT id, 'Equipment & Machine Degreasing', 120 FROM service_categories WHERE name = 'Industrial & Warehouse Cleaning'
UNION ALL SELECT id, 'Rafter & Beam Dust Removal', 180 FROM service_categories WHERE name = 'Industrial & Warehouse Cleaning'
UNION ALL SELECT id, 'Spill Containment & Cleanup', 90 FROM service_categories WHERE name = 'Industrial & Warehouse Cleaning'
UNION ALL SELECT id, 'Loading Dock Washing & Degreasing', 120 FROM service_categories WHERE name = 'Industrial & Warehouse Cleaning'
UNION ALL SELECT id, 'High-Level Industrial Dusting', 150 FROM service_categories WHERE name = 'Industrial & Warehouse Cleaning'
UNION ALL SELECT id, 'Safety Line Repainting & Marking', 90 FROM service_categories WHERE name = 'Industrial & Warehouse Cleaning'
UNION ALL SELECT id, 'Warehouse Rack & Shelving Cleaning', 120 FROM service_categories WHERE name = 'Industrial & Warehouse Cleaning'
UNION ALL SELECT id, 'Production Area Sanitation', 150 FROM service_categories WHERE name = 'Industrial & Warehouse Cleaning';

-- Category 5: Specialty Cleaning & Sanitation (10 services)
INSERT INTO services (category_id, name, estimated_duration)
SELECT id, 'Medical & Clinic Cleaning (Infection Control)', 180 FROM service_categories WHERE name = 'Specialty Cleaning & Sanitation'
UNION ALL SELECT id, 'Dental Office & Lab Cleaning', 120 FROM service_categories WHERE name = 'Specialty Cleaning & Sanitation'
UNION ALL SELECT id, 'Fitness Center & Gym Sanitization', 150 FROM service_categories WHERE name = 'Specialty Cleaning & Sanitation'
UNION ALL SELECT id, 'Restaurant & Commercial Kitchen Degreasing', 180 FROM service_categories WHERE name = 'Specialty Cleaning & Sanitation'
UNION ALL SELECT id, 'Hood, Vent & Filter Cleaning', 120 FROM service_categories WHERE name = 'Specialty Cleaning & Sanitation'
UNION ALL SELECT id, 'School & Daycare Eco-Safe Cleaning', 180 FROM service_categories WHERE name = 'Specialty Cleaning & Sanitation'
UNION ALL SELECT id, 'Mold & Mildew Remediation', 240 FROM service_categories WHERE name = 'Specialty Cleaning & Sanitation'
UNION ALL SELECT id, 'Biohazard Cleanup & Disinfection', 180 FROM service_categories WHERE name = 'Specialty Cleaning & Sanitation'
UNION ALL SELECT id, 'Electrostatic Spraying & ULV Fogging', 90 FROM service_categories WHERE name = 'Specialty Cleaning & Sanitation'
UNION ALL SELECT id, 'COVID-19 & Outbreak Sanitation', 120 FROM service_categories WHERE name = 'Specialty Cleaning & Sanitation';

-- Category 6: Facility Maintenance & Handyman Support (10 services)
INSERT INTO services (category_id, name, estimated_duration)
SELECT id, 'Supply Restocking (Soap, Tissue, Liners)', 30 FROM service_categories WHERE name = 'Facility Maintenance & Handyman Support'
UNION ALL SELECT id, 'Janitorial Supply Inventory Management', 60 FROM service_categories WHERE name = 'Facility Maintenance & Handyman Support'
UNION ALL SELECT id, 'Light Bulb & Ballast Replacement', 45 FROM service_categories WHERE name = 'Facility Maintenance & Handyman Support'
UNION ALL SELECT id, 'Furniture Assembly & Reconfiguration', 120 FROM service_categories WHERE name = 'Facility Maintenance & Handyman Support'
UNION ALL SELECT id, 'Painting & Drywall Touch-Ups', 180 FROM service_categories WHERE name = 'Facility Maintenance & Handyman Support'
UNION ALL SELECT id, 'General Repair & Preventive Maintenance', 120 FROM service_categories WHERE name = 'Facility Maintenance & Handyman Support'
UNION ALL SELECT id, 'After-Hours Lock-Up & Security Checks', 30 FROM service_categories WHERE name = 'Facility Maintenance & Handyman Support'
UNION ALL SELECT id, 'Odour Control & Scent Systems', 45 FROM service_categories WHERE name = 'Facility Maintenance & Handyman Support'
UNION ALL SELECT id, 'Routine Inspections & Quality Audits', 90 FROM service_categories WHERE name = 'Facility Maintenance & Handyman Support'
UNION ALL SELECT id, 'On-Site Supervision (Large Accounts)', 240 FROM service_categories WHERE name = 'Facility Maintenance & Handyman Support';

-- Category 7: Exterior & Building Services (10 services)
INSERT INTO services (category_id, name, estimated_duration)
SELECT id, 'High-Rise Window & Glass Wall Cleaning', 240 FROM service_categories WHERE name = 'Exterior & Building Services'
UNION ALL SELECT id, 'Skylight, Glass Wall, Mirror Cleaning', 120 FROM service_categories WHERE name = 'Exterior & Building Services'
UNION ALL SELECT id, 'Pressure Washing (Walls, Parking Lots, Sidewalks)', 180 FROM service_categories WHERE name = 'Exterior & Building Services'
UNION ALL SELECT id, 'Graffiti Removal', 90 FROM service_categories WHERE name = 'Exterior & Building Services'
UNION ALL SELECT id, 'Gutter & Downspout Cleaning', 120 FROM service_categories WHERE name = 'Exterior & Building Services'
UNION ALL SELECT id, 'Exterior Garbage Area & Dumpster Pad Sanitizing', 60 FROM service_categories WHERE name = 'Exterior & Building Services'
UNION ALL SELECT id, 'Façade & Signage Cleaning', 150 FROM service_categories WHERE name = 'Exterior & Building Services'
UNION ALL SELECT id, 'Building Envelope Cleaning & Inspection Support', 180 FROM service_categories WHERE name = 'Exterior & Building Services'
UNION ALL SELECT id, 'Parking Lot Sweeping & Litter Pickup', 90 FROM service_categories WHERE name = 'Exterior & Building Services'
UNION ALL SELECT id, 'Exterior Seasonal Maintenance', 120 FROM service_categories WHERE name = 'Exterior & Building Services';

-- Category 8: Grounds & Seasonal Services (5 services)
INSERT INTO services (category_id, name, estimated_duration)
SELECT id, 'Landscaping & Lawn Cutting', 120 FROM service_categories WHERE name = 'Grounds & Seasonal Services'
UNION ALL SELECT id, 'Garden Trimming, Edging, Maintenance', 90 FROM service_categories WHERE name = 'Grounds & Seasonal Services'
UNION ALL SELECT id, 'Snow Removal & De-Icing', 120 FROM service_categories WHERE name = 'Grounds & Seasonal Services'
UNION ALL SELECT id, 'Seasonal Property Cleanup', 150 FROM service_categories WHERE name = 'Grounds & Seasonal Services'
UNION ALL SELECT id, 'Waste Diversion & Recycling Programs', 60 FROM service_categories WHERE name = 'Grounds & Seasonal Services';

-- Category 9: Event, Property & Specialty Support (10 services)
INSERT INTO services (category_id, name, estimated_duration)
SELECT id, 'Pre & Post-Event Cleaning', 180 FROM service_categories WHERE name = 'Event, Property & Specialty Support'
UNION ALL SELECT id, 'Trade Show, Expo & Theatre Cleanup', 240 FROM service_categories WHERE name = 'Event, Property & Specialty Support'
UNION ALL SELECT id, 'Suite Turnover Cleaning (Move-In/Out)', 150 FROM service_categories WHERE name = 'Event, Property & Specialty Support'
UNION ALL SELECT id, 'Condo & Apartment Common Area Cleaning', 120 FROM service_categories WHERE name = 'Event, Property & Specialty Support'
UNION ALL SELECT id, 'Laundry & Garbage Chute Room Cleaning', 60 FROM service_categories WHERE name = 'Event, Property & Specialty Support'
UNION ALL SELECT id, 'Temporary Staff Support (Busy Periods)', 240 FROM service_categories WHERE name = 'Event, Property & Specialty Support'
UNION ALL SELECT id, 'Facility Supply Chain & Consumable Delivery', 60 FROM service_categories WHERE name = 'Event, Property & Specialty Support'
UNION ALL SELECT id, 'Pest-Related Cleanup & Sanitization', 120 FROM service_categories WHERE name = 'Event, Property & Specialty Support'
UNION ALL SELECT id, 'Emergency Cleaning (Floods, Fire, Vandalism)', 180 FROM service_categories WHERE name = 'Event, Property & Specialty Support'
UNION ALL SELECT id, '24/7 Dispatch & Customer Support', 60 FROM service_categories WHERE name = 'Event, Property & Specialty Support';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_booking_services_booking ON booking_services(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_services_service ON booking_services(service_id);

-- Final verification
SELECT '✅ Phase 1 Complete!' as result;
SELECT 'Categories: ' || COUNT(*) as categories FROM service_categories;
SELECT 'Services: ' || COUNT(*) as services FROM services;
SELECT '🎯 Ready for Phase 2: Update frontend!' as next_step;

