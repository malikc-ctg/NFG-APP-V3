/**
 * Recurring Jobs Module for NFG App
 * Handles automatic creation of recurring job instances
 */

import { supabase } from './supabase.js'

/**
 * Calculate the next occurrence date based on recurrence pattern
 * @param {Date} currentDate - The current job's scheduled date
 * @param {string} pattern - 'weekly', 'biweekly', or 'monthly'
 * @returns {Date} - The next occurrence date
 */
function calculateNextOccurrence(currentDate, pattern) {
  const nextDate = new Date(currentDate)
  
  switch (pattern) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7)
      break
    case 'biweekly':
      nextDate.setDate(nextDate.getDate() + 14)
      break
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1)
      break
    default:
      nextDate.setDate(nextDate.getDate() + 7) // Default to weekly
  }
  
  return nextDate
}

/**
 * Create the next instance of a recurring job
 * @param {object} completedJob - The job that was just completed
 * @returns {object} - The newly created job or null if error
 */
export async function createNextRecurringInstance(completedJob) {
  try {
    console.log('🔄 Creating next recurring instance for job:', completedJob.id)
    
    // Only create next instance if this is a recurring job
    if (completedJob.frequency !== 'recurring') {
      console.log('⚠️ Job is not recurring, skipping auto-creation')
      return null
    }
    
    // Get the recurrence pattern (default to weekly if not set)
    const pattern = completedJob.recurrence_pattern || 'weekly'
    
    // Calculate next occurrence date
    const currentDate = new Date(completedJob.scheduled_date)
    const nextDate = calculateNextOccurrence(currentDate, pattern)
    
    // Generate recurrence series ID if not exists
    const seriesId = completedJob.recurrence_series_id || completedJob.id
    
    // Create the new job instance
    const newJob = {
      title: completedJob.title,
      site_id: completedJob.site_id,
      client_id: completedJob.client_id,
      assigned_worker_id: completedJob.assigned_worker_id,
      job_type: completedJob.job_type,
      description: completedJob.description,
      scheduled_date: nextDate.toISOString().split('T')[0],
      frequency: 'recurring',
      recurrence_pattern: pattern,
      recurrence_series_id: seriesId,
      status: 'pending',
      estimated_hours: completedJob.estimated_hours
    }
    
    console.log('📝 Creating new job instance:', newJob)
    
    const { data, error } = await supabase
      .from('jobs')
      .insert([newJob])
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error creating next recurring instance:', error)
      throw error
    }
    
    console.log('✅ Next recurring instance created:', data.id)
    
    // Copy tasks from the completed job to the new job
    await copyTasksToNewJob(completedJob.id, data.id)
    
    // Update the completed job's recurrence_series_id if it wasn't set
    if (!completedJob.recurrence_series_id) {
      await supabase
        .from('jobs')
        .update({ recurrence_series_id: seriesId })
        .eq('id', completedJob.id)
    }
    
    return data
  } catch (error) {
    console.error('Error in createNextRecurringInstance:', error)
    return null
  }
}

/**
 * Copy tasks from one job to another
 * @param {string} sourceJobId - The job to copy tasks from
 * @param {string} targetJobId - The job to copy tasks to
 */
async function copyTasksToNewJob(sourceJobId, targetJobId) {
  try {
    console.log('📋 Copying tasks from job', sourceJobId, 'to', targetJobId)
    
    // Fetch tasks from source job
    const { data: tasks, error: fetchError } = await supabase
      .from('job_tasks')
      .select('title, description, photo_required')
      .eq('job_id', sourceJobId)
    
    if (fetchError) {
      console.error('Error fetching source tasks:', fetchError)
      return
    }
    
    if (!tasks || tasks.length === 0) {
      console.log('No tasks to copy')
      return
    }
    
    // Create new tasks for target job
    const newTasks = tasks.map(task => ({
      job_id: targetJobId,
      title: task.title,
      description: task.description,
      photo_required: task.photo_required,
      completed: false
    }))
    
    const { error: insertError } = await supabase
      .from('job_tasks')
      .insert(newTasks)
    
    if (insertError) {
      console.error('Error inserting new tasks:', insertError)
      return
    }
    
    console.log(`✅ Copied ${tasks.length} tasks to new job`)
  } catch (error) {
    console.error('Error copying tasks:', error)
  }
}

/**
 * Check if a job should create next instance and do it
 * Called when a job status changes to 'completed'
 * @param {object} job - The job object
 */
export async function handleJobCompletion(job) {
  if (job.frequency === 'recurring' && job.status === 'completed') {
    console.log('🔄 Job completed, checking for recurring creation')
    const nextJob = await createNextRecurringInstance(job)
    
    if (nextJob) {
      return {
        success: true,
        message: `✅ Job completed! Next occurrence scheduled for ${new Date(nextJob.scheduled_date).toLocaleDateString()}`,
        nextJob
      }
    }
  }
  
  return {
    success: true,
    message: '✅ Job completed successfully!'
  }
}

/**
 * Initialize a recurring job series when creating a new recurring job
 * @param {object} jobData - The job data being created
 * @returns {object} - Updated job data with recurrence fields
 */
export function initializeRecurringSeries(jobData) {
  if (jobData.frequency === 'recurring') {
    // Generate a new series ID if not provided
    if (!jobData.recurrence_series_id) {
      jobData.recurrence_series_id = crypto.randomUUID()
    }
    
    // Set default pattern if not provided
    if (!jobData.recurrence_pattern) {
      jobData.recurrence_pattern = 'weekly'
    }
    
    // Mark as template if this is the first in series
    if (!jobData.is_recurring_template) {
      jobData.is_recurring_template = true
    }
  }
  
  return jobData
}

