-- ════════════════════════════════════════════════════════════════════
-- Migration: QR Code Ride Validation
-- Run once in Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════

-- 1. Each ride gets a unique QR token (already default gen_random_uuid, so existing rows get one too)
ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS validation_token UUID NOT NULL DEFAULT gen_random_uuid();

-- 2. Track when a passenger physically boards
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS boarded_at TIMESTAMPTZ;

-- 3. Add passenger_boarded to notifications type check if one exists
--    (skip if your notifications table has no CHECK on type)
-- ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
