-- Phase 7: Add business impact fields to issues table
-- Run this in your Supabase SQL Editor

ALTER TABLE issues ADD COLUMN business_impact_risk_level text;
ALTER TABLE issues ADD COLUMN business_impact_fix_time text;
ALTER TABLE issues ADD COLUMN business_impact_priority_rank integer;
