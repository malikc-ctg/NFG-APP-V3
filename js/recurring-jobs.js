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
      estimated_hours: completedJob.estimated_hours,
      created_by: completedJob.created_by  // CRITICAL: Preserve the owner!
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
    
    // Check if this job is linked to a booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('job_id', job.id)
      .single()
    
    if (!bookingError && booking && booking.frequency === 'recurring') {
      // If linked to a recurring booking, create the next booking (which will auto-create its job)
      console.log('📅 Job is linked to recurring booking, creating next booking instance')
      const nextBooking = await createNextBookingInstance(booking)
      
      if (nextBooking) {
        return {
          success: true,
          message: `✅ Job completed! Next booking scheduled for ${new Date(nextBooking.scheduled_date).toLocaleDateString()}`,
          nextBooking
        }
      }
    } else {
      // Standalone recurring job (not linked to booking), create next job directly
      const nextJob = await createNextRecurringInstance(job)
      
      if (nextJob) {
        return {
          success: true,
          message: `✅ Job completed! Next occurrence scheduled for ${new Date(nextJob.scheduled_date).toLocaleDateString()}`,
          nextJob
        }
      }
    }
  }
  
  return {
    success: true,
    message: '✅ Job completed successfully!'
  }
}

/**
 * Create the next instance of a recurring booking (and its job)
 * @param {object} completedBooking - The booking whose job was just completed
 * @returns {object} - The newly created booking or null if error
 */
async function createNextBookingInstance(completedBooking) {
  try {
    console.log('📅 Creating next recurring booking instance for:', completedBooking.id)
    
    // Get the recurrence pattern (default to weekly if not set)
    const pattern = completedBooking.recurrence_pattern || 'weekly'
    
    // Calculate next occurrence date
    const currentDate = new Date(completedBooking.scheduled_date)
    const nextDate = calculateNextOccurrence(currentDate, pattern)
    
    // Generate recurrence series ID if not exists
    const seriesId = completedBooking.recurrence_series_id || completedBooking.id
    
    // Step 1: Fetch the site to get the assigned worker
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('assigned_worker_id')
      .eq('id', completedBooking.site_id)
      .single()
    
    if (siteError) throw siteError
    
    // Step 2: Create the new job first
    const newJobData = {
      title: completedBooking.title,
      site_id: completedBooking.site_id,
      client_id: completedBooking.client_id,
      assigned_worker_id: site?.assigned_worker_id,
      job_type: 'cleaning', // Default for recurring bookings
      description: completedBooking.description,
      scheduled_date: nextDate.toISOString().split('T')[0],
      frequency: 'recurring',
      recurrence_pattern: pattern,
      recurrence_series_id: seriesId,
      status: 'pending'
    }
    
    const { data: newJob, error: newJobError } = await supabase
      .from('jobs')
      .insert([newJobData])
      .select()
      .single()
    
    if (newJobError) throw newJobError
    
    console.log('✅ Job created for next booking instance:', newJob.id)
    
    // Step 3: Create the new booking and link to the job
    const newBookingData = {
      title: completedBooking.title,
      site_id: completedBooking.site_id,
      client_id: completedBooking.client_id,
      description: completedBooking.description,
      scheduled_date: nextDate.toISOString().split('T')[0],
      frequency: 'recurring',
      recurrence_pattern: pattern,
      recurrence_series_id: seriesId,
      status: 'pending',
      job_id: newJob.id
    }
    
    const { data: newBooking, error: newBookingError } = await supabase
      .from('bookings')
      .insert([newBookingData])
      .select()
      .single()
    
    if (newBookingError) throw newBookingError
    
    console.log('✅ Next recurring booking created:', newBooking.id)
    
    // Step 4: Copy services from the completed booking to the new booking
    const { data: bookingServices, error: servicesError } = await supabase
      .from('booking_services')
      .select('service_id, quantity')
      .eq('booking_id', completedBooking.id)
    
    if (!servicesError && bookingServices && bookingServices.length > 0) {
      const newServices = bookingServices.map(bs => ({
        booking_id: newBooking.id,
        service_id: bs.service_id,
        quantity: bs.quantity || 1
      }))
      
      await supabase
        .from('booking_services')
        .insert(newServices)
      
      console.log(`✅ Copied ${bookingServices.length} services to new booking`)
      
      // Step 5: Create job tasks from services
      const { data: services } = await supabase
        .from('services')
        .select('id, name')
        .in('id', bookingServices.map(bs => bs.service_id))
      
      if (services && services.length > 0) {
        const tasks = services.map(service => ({
          job_id: newJob.id,
          title: service.name,
          photo_required: true,
          completed: false
        }))
        
        await supabase
          .from('job_tasks')
          .insert(tasks)
        
        console.log(`✅ Created ${tasks.length} tasks for new job`)
      }
    }
    
    // Update the completed booking's recurrence_series_id if it wasn't set
    if (!completedBooking.recurrence_series_id) {
      await supabase
        .from('bookings')
        .update({ recurrence_series_id: seriesId })
        .eq('id', completedBooking.id)
    }
    
    return newBooking
  } catch (error) {
    console.error('Error in createNextBookingInstance:', error)
    return null
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

