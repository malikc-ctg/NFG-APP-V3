-- Quick fix: Create Northern Facilities Group company and link user
-- Run this in Supabase SQL Editor

DO $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
BEGIN
    -- Get your user ID (replace email with your actual email)
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = 'malikjcampbell05@gmail.com'
    LIMIT 1;

    -- Check if company already exists
    SELECT id INTO v_company_id 
    FROM company_profiles 
    WHERE company_name ILIKE '%Northern Facilities%' 
       OR company_name ILIKE '%NFG%'
    LIMIT 1;

    -- If company doesn't exist, create it
    IF v_company_id IS NULL THEN
        INSERT INTO company_profiles (owner_id, company_name, industry_type, phone_number)
        VALUES (v_user_id, 'Northern Facilities Group', 'Facilities Management', '000-000-0000')
        RETURNING id INTO v_company_id;
        
        RAISE NOTICE 'Created company: Northern Facilities Group (ID: %)', v_company_id;
    ELSE
        RAISE NOTICE 'Found existing company (ID: %)', v_company_id;
    END IF;

    -- Link user to company
    UPDATE user_profiles 
    SET company_id = v_company_id
    WHERE id = v_user_id;

    RAISE NOTICE 'User linked to company successfully!';
END $$;

-- Verify it worked
SELECT 
    up.email,
    cp.company_name,
    cp.id as company_id
FROM user_profiles up
LEFT JOIN company_profiles cp ON up.company_id = cp.id
WHERE up.email = 'malikjcampbell05@gmail.com';
