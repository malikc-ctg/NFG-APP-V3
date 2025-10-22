-- ============================================
-- NFG Jobs System - Supabase Schema
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Drop existing tables if they exist (in case of previous failed attempt)
DROP TABLE IF EXISTS job_tasks CASCADE;
DROP TABLE IF EXISTS job_employees CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;

-- Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  site_id BIGINT NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('cleaning', 'maintenance', 'repair', 'inspection', 'emergency')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'cancelled')),
  scheduled_date DATE,
  estimated_hours NUMERIC(5,2),
  description TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Employees (Assignment tracking)
CREATE TABLE IF NOT EXISTS job_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'Employee',
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Tasks (Checklist items)
CREATE TABLE IF NOT EXISTS job_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  photo_required BOOLEAN DEFAULT FALSE,
  completed BOOLEAN DEFAULT FALSE,
  photo_url TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_site_id ON jobs(site_id);
CREATE INDEX IF NOT EXISTS idx_job_employees_job_id ON job_employees(job_id);
CREATE INDEX IF NOT EXISTS idx_job_tasks_job_id ON job_tasks(job_id);

-- Enable Row Level Security
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for jobs
CREATE POLICY "Users can view their own jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs"
  ON jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs"
  ON jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs"
  ON jobs FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for job_employees
CREATE POLICY "Users can view employees for their jobs"
  ON job_employees FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_employees.job_id AND jobs.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert employees for their jobs"
  ON job_employees FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_employees.job_id AND jobs.user_id = auth.uid()
  ));

CREATE POLICY "Users can update employees for their jobs"
  ON job_employees FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_employees.job_id AND jobs.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete employees for their jobs"
  ON job_employees FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_employees.job_id AND jobs.user_id = auth.uid()
  ));

-- RLS Policies for job_tasks
CREATE POLICY "Users can view tasks for their jobs"
  ON job_tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_tasks.job_id AND jobs.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert tasks for their jobs"
  ON job_tasks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_tasks.job_id AND jobs.user_id = auth.uid()
  ));

CREATE POLICY "Users can update tasks for their jobs"
  ON job_tasks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_tasks.job_id AND jobs.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete tasks for their jobs"
  ON job_tasks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_tasks.job_id AND jobs.user_id = auth.uid()
  ));

-- Create a storage bucket for job photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for job-photos bucket
CREATE POLICY "Users can upload job photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'job-photos' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view their job photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'job-photos' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their job photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'job-photos' AND
    auth.role() = 'authenticated'
  );

