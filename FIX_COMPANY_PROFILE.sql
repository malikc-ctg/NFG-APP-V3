-- Fix Company Profile for Payment Gateway
-- Run this in Supabase SQL Editor

-- First, check if company exists
SELECT * FROM company_profiles WHERE company_name ILIKE '%Northern Facilities%' OR company_name ILIKE '%NFG%';

-- If company doesn't exist, create it (replace 'YOUR_USER_ID' with actual user ID)
-- Get your user ID first:
SELECT id, email FROM auth.users WHERE email = 'malikjcampbell05@gmail.com';

-- Then create company (replace YOUR_USER_ID with the ID from above):
-- INSERT INTO company_profiles (owner_id, company_name, industry_type, phone_number)
-- VALUES ('YOUR_USER_ID', 'Northern Facilities Group', 'Facilities Management', '000-000-0000');

-- Link user to company (replace YOUR_USER_ID and COMPANY_ID):
-- UPDATE user_profiles 
-- SET company_id = 'COMPANY_ID'
-- WHERE id = 'YOUR_USER_ID';

-- Quick fix: Create company and link user in one go
DO $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
BEGIN
    -- Get user ID
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = 'malikjcampbell05@gmail.com'
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Check if company exists
    SELECT id INTO v_company_id 
    FROM company_profiles 
    WHERE owner_id = v_user_id 
       OR company_name ILIKE '%Northern Facilities%'
    LIMIT 1;

    -- If company doesn't exist, create it
    IF v_company_id IS NULL THEN
        INSERT INTO company_profiles (owner_id, company_name, industry_type, phone_number)
        VALUES (v_user_id, 'Northern Facilities Group', 'Facilities Management', '000-000-0000')
        RETURNING id INTO v_company_id;
    END IF;

    -- Link user to company
    UPDATE user_profiles 
    SET company_id = v_company_id
    WHERE id = v_user_id;

    RAISE NOTICE 'Company created/linked successfully. Company ID: %', v_company_id;
END $$;
