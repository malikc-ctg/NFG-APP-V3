-- ==========================================
-- PHASE 2: VERIFICATION QUERIES
-- ==========================================
-- Run these after executing ADD_PAYMENT_SYSTEM_SCHEMA.sql
-- ==========================================

-- ==========================================
-- 1. CHECK NEW TABLES EXIST
-- ==========================================
SELECT 
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'platform_subscriptions',
  'platform_payments',
  'payment_gateway_connections',
  'payment_intents',
  'gateway_oauth_sessions',
  'bank_accounts'
)
ORDER BY table_name;

-- ==========================================
-- 2. CHECK COMPANY_PROFILES COLUMNS
-- ==========================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'company_profiles' 
AND column_name LIKE '%payment%'
ORDER BY column_name;

-- ==========================================
-- 3. CHECK PAYMENTS COLUMNS
-- ==========================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name LIKE '%gateway%'
ORDER BY column_name;

-- ==========================================
-- 4. CHECK INDEXES WERE CREATED
-- ==========================================
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND (
  indexname LIKE '%payment%' 
  OR indexname LIKE '%gateway%'
  OR indexname LIKE '%platform%'
)
ORDER BY tablename, indexname;

-- ==========================================
-- 5. CHECK RLS IS ENABLED
-- ==========================================
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'platform_subscriptions',
  'platform_payments',
  'payment_gateway_connections',
  'payment_intents',
  'gateway_oauth_sessions',
  'bank_accounts'
)
ORDER BY tablename;

-- ==========================================
-- 6. CHECK FOREIGN KEY CONSTRAINTS
-- ==========================================
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN (
  'platform_subscriptions',
  'platform_payments',
  'payment_gateway_connections',
  'payment_intents',
  'gateway_oauth_sessions',
  'bank_accounts'
)
ORDER BY tc.table_name, kcu.column_name;

-- ==========================================
-- 7. SUMMARY CHECK
-- ==========================================
SELECT 
  'New Tables' as category,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'platform_subscriptions',
  'platform_payments',
  'payment_gateway_connections',
  'payment_intents',
  'gateway_oauth_sessions',
  'bank_accounts'
)
UNION ALL
SELECT 
  'Company Profile Payment Columns' as category,
  COUNT(*) as count
FROM information_schema.columns 
WHERE table_name = 'company_profiles' 
AND column_name LIKE '%payment%'
UNION ALL
SELECT 
  'Payment Gateway Columns' as category,
  COUNT(*) as count
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name LIKE '%gateway%';

-- ==========================================
-- ✅ EXPECTED RESULTS:
-- ==========================================
-- New Tables: 6
-- Company Profile Payment Columns: 6
-- Payment Gateway Columns: 7
-- All RLS should be ENABLED
-- ==========================================
