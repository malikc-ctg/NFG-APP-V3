/**
 * Recurring Bookings Module for NFG App
 * Handles automatic creation of recurring booking instances
 */

import { supabase } from './supabase.js'

/**
 * Calculate the next occurrence date based on recurrence pattern
 * @param {Date} currentDate - The current booking's scheduled date
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
 * Create the next instance of a recurring booking
 * @param {object} completedBooking - The booking whose job was just completed
 * @returns {object} - The newly created booking or null if error
 */
export async function createNextRecurringBooking(completedBooking) {
  try {
    console.log('🔄 Creating next recurring booking instance for:', completedBooking.id)
    
    // Only create next instance if this is a recurring booking
    if (completedBooking.frequency !== 'recurring') {
      console.log('⚠️ Booking is not recurring, skipping auto-creation')
      return null
    }
    
    // Get the recurrence pattern (default to weekly if not set)
    const pattern = completedBooking.recurrence_pattern || 'weekly'
    
    // Calculate next occurrence date
    const currentDate = new Date(completedBooking.scheduled_date)
    const nextDate = calculateNextOccurrence(currentDate, pattern)
    
    // Generate recurrence series ID if not exists
    const seriesId = completedBooking.recurrence_series_id || completedBooking.id
    
    // Create the new booking instance
    const newBooking = {
      title: completedBooking.title,
      site_id: completedBooking.site_id,
      client_id: completedBooking.client_id,
      description: completedBooking.description,
      scheduled_date: nextDate.toISOString().split('T')[0],
      frequency: 'recurring',
      recurrence_pattern: pattern,
      recurrence_series_id: seriesId,
      status: 'pending'
    }
    
    console.log('📝 Creating new booking instance:', newBooking)
    
    const { data: newBookingData, error } = await supabase
      .from('bookings')
      .insert([newBooking])
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error creating next recurring booking:', error)
      throw error
    }
    
    console.log('✅ Next recurring booking created:', newBookingData.id)
    
    // Copy services from the completed booking to the new booking
    await copyServicesToNewBooking(completedBooking.id, newBookingData.id)
    
    // Update the completed booking's recurrence_series_id if it wasn't set
    if (!completedBooking.recurrence_series_id) {
      await supabase
        .from('bookings')
        .update({ recurrence_series_id: seriesId })
        .eq('id', completedBooking.id)
    }
    
    // Auto-create job for the new booking (using existing job auto-creation logic)
    await createJobForBooking(newBookingData)
    
    return newBookingData
  } catch (error) {
    console.error('Error in createNextRecurringBooking:', error)
    return null
  }
}

/**
 * Copy services from one booking to another
 * @param {string} sourceBookingId - The booking to copy services from
 * @param {string} targetBookingId - The booking to copy services to
 */
async function copyServicesToNewBooking(sourceBookingId, targetBookingId) {
  try {
    console.log('📋 Copying services from booking', sourceBookingId, 'to', targetBookingId)
    
    // Fetch services from source booking
    const { data: services, error: fetchError } = await supabase
      .from('booking_services')
      .select('service_id')
      .eq('booking_id', sourceBookingId)
    
    if (fetchError) {
      console.error('Error fetching source services:', fetchError)
      return
    }
    
    if (!services || services.length === 0) {
      console.log('No services to copy')
      return
    }
    
    // Create new services for target booking
    const newServices = services.map(service => ({
      booking_id: targetBookingId,
      service_id: service.service_id
    }))
    
    const { error: insertError } = await supabase
      .from('booking_services')
      .insert(newServices)
    
    if (insertError) {
      console.error('Error inserting new services:', insertError)
      return
    }
    
    console.log(`✅ Copied ${services.length} services to new booking`)
  } catch (error) {
    console.error('Error copying services:', error)
  }
}

/**
 * Create a job for a booking (Phase 3 logic from bookings)
 * @param {object} booking - The booking to create a job for
 */
async function createJobForBooking(booking) {
  try {
    console.log('🔨 Auto-creating job for recurring booking:', booking.id)
    
    // Fetch the site to get the assigned worker
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('assigned_worker_id')
      .eq('id', booking.site_id)
      .single()
    
    if (siteError) {
      console.error('Error fetching site:', siteError)
      return
    }
    
    // Create the job
    const jobData = {
      title: booking.title,
      site_id: booking.site_id,
      client_id: booking.client_id,
      assigned_worker_id: site?.assigned_worker_id,
      job_type: 'cleaning', // Default for recurring bookings
      description: booking.description,
      scheduled_date: booking.scheduled_date,
      frequency: 'recurring',
      recurrence_pattern: booking.recurrence_pattern,
      recurrence_series_id: booking.recurrence_series_id,
      status: 'pending'
    }
    
    const { data: newJob, error: jobError } = await supabase
      .from('jobs')
      .insert([jobData])
      .select()
      .single()
    
    if (jobError) {
      console.error('Error creating job:', jobError)
      return
    }
    
    console.log('✅ Job created for recurring booking:', newJob.id)
    
    // Link the job back to the booking
    await supabase
      .from('bookings')
      .update({ job_id: newJob.id })
      .eq('id', booking.id)
    
    // Copy services as tasks
    const { data: bookingServices } = await supabase
      .from('booking_services')
      .select('*, services(name)')
      .eq('booking_id', booking.id)
    
    if (bookingServices && bookingServices.length > 0) {
      const tasks = bookingServices.map(bs => ({
        job_id: newJob.id,
        title: bs.services.name,
        photo_required: true,
        completed: false
      }))
      
      await supabase
        .from('job_tasks')
        .insert(tasks)
      
      console.log(`✅ Created ${tasks.length} tasks for job`)
    }
  } catch (error) {
    console.error('Error creating job for booking:', error)
  }
}

/**
 * Check if a booking's job was completed and create next booking if recurring
 * Called when a job is completed
 * @param {object} job - The completed job object
 */
export async function handleJobCompletionForBooking(job) {
  try {
    console.log('🔍 Checking if completed job has a recurring booking:', job.id)
    
    // Find the booking linked to this job
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('job_id', job.id)
      .single()
    
    if (error || !booking) {
      console.log('No booking found for this job')
      return null
    }
    
    if (booking.frequency === 'recurring') {
      console.log('🔄 Booking is recurring, creating next instance')
      const nextBooking = await createNextRecurringBooking(booking)
      
      if (nextBooking) {
        return {
          success: true,
          message: `Next booking scheduled for ${new Date(nextBooking.scheduled_date).toLocaleDateString()}`,
          nextBooking
        }
      }
    }
    
    return null
  } catch (error) {
    console.error('Error in handleJobCompletionForBooking:', error)
    return null
  }
}

/**
 * Initialize a recurring booking series when creating a new recurring booking
 * @param {object} bookingData - The booking data being created
 * @returns {object} - Updated booking data with recurrence fields
 */
export function initializeRecurringBookingSeries(bookingData) {
  if (bookingData.frequency === 'recurring') {
    // Generate a new series ID if not provided
    if (!bookingData.recurrence_series_id) {
      bookingData.recurrence_series_id = crypto.randomUUID()
    }
    
    // Set default pattern if not provided
    if (!bookingData.recurrence_pattern) {
      bookingData.recurrence_pattern = 'weekly'
    }
    
    // Mark as template if this is the first in series
    if (!bookingData.is_recurring_template) {
      bookingData.is_recurring_template = true
    }
  }
  
  return bookingData
}

