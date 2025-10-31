/**
 * Notification Triggers
 * Automatically creates notifications for key events
 */

import { createNotification } from './notification-center.js';
import { supabase } from './supabase.js';

/**
 * Create notification when job is assigned to a worker
 */
export async function notifyJobAssigned(jobId, workerId, jobTitle, siteName) {
  try {
    const notification = await createNotification(
      workerId,
      'job_assigned',
      'New Job Assigned',
      `You've been assigned to "${jobTitle}" at ${siteName}`,
      `jobs.html#job-${jobId}`,
      { job_id: jobId, site_name: siteName }
    );
    
    return notification;
  } catch (error) {
    console.error('❌ Failed to create job assignment notification:', error);
    return null;
  }
}

/**
 * Create notification when job is completed
 */
export async function notifyJobCompleted(jobId, adminIds, jobTitle, siteName) {
  try {
    // Notify all admins
    const notifications = [];
    for (const adminId of adminIds) {
      const notification = await createNotification(
        adminId,
        'job_completed',
        'Job Completed',
        `"${jobTitle}" at ${siteName} has been completed`,
        `jobs.html#job-${jobId}`,
        { job_id: jobId, site_name: siteName }
      );
      if (notification) notifications.push(notification);
    }
    
    return notifications;
  } catch (error) {
    console.error('❌ Failed to create job completion notification:', error);
    return [];
  }
}

/**
 * Create notification when job is updated
 */
export async function notifyJobUpdated(jobId, userId, jobTitle, updateType) {
  try {
    const notification = await createNotification(
      userId,
      'job_updated',
      'Job Updated',
      `"${jobTitle}" has been updated: ${updateType}`,
      `jobs.html#job-${jobId}`,
      { job_id: jobId, update_type: updateType }
    );
    
    return notification;
  } catch (error) {
    console.error('❌ Failed to create job update notification:', error);
    return null;
  }
}

/**
 * Create notification when booking is created
 */
export async function notifyBookingCreated(bookingId, clientId, bookingTitle, siteName) {
  try {
    const notification = await createNotification(
      clientId,
      'booking_created',
      'New Booking Created',
      `Booking "${bookingTitle}" has been created for ${siteName}`,
      `bookings.html#booking-${bookingId}`,
      { booking_id: bookingId, site_name: siteName }
    );
    
    return notification;
  } catch (error) {
    console.error('❌ Failed to create booking notification:', error);
    return null;
  }
}

/**
 * Create notification when booking is cancelled
 */
export async function notifyBookingCancelled(bookingId, userId, bookingTitle) {
  try {
    const notification = await createNotification(
      userId,
      'booking_cancelled',
      'Booking Cancelled',
      `Booking "${bookingTitle}" has been cancelled`,
      `bookings.html#booking-${bookingId}`,
      { booking_id: bookingId }
    );
    
    return notification;
  } catch (error) {
    console.error('❌ Failed to create booking cancellation notification:', error);
    return null;
  }
}

/**
 * Create notification when worker is assigned to a site
 */
export async function notifySiteAssigned(workerId, siteId, siteName) {
  try {
    const notification = await createNotification(
      workerId,
      'site_assigned',
      'Site Assigned',
      `You've been assigned to "${siteName}"`,
      `sites.html#site-${siteId}`,
      { site_id: siteId, site_name: siteName }
    );
    
    return notification;
  } catch (error) {
    console.error('❌ Failed to create site assignment notification:', error);
    return null;
  }
}

/**
 * Create notification when worker is removed from a site
 */
export async function notifySiteUnassigned(workerId, siteId, siteName) {
  try {
    const notification = await createNotification(
      workerId,
      'system',
      'Site Assignment Removed',
      `You've been removed from "${siteName}"`,
      `sites.html`,
      { site_id: siteId, site_name: siteName }
    );
    
    return notification;
  } catch (error) {
    console.error('❌ Failed to create site unassignment notification:', error);
    return null;
  }
}

/**
 * Get all admin user IDs
 */
async function getAdminUserIds() {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .in('role', ['admin', 'client']);
    
    if (error) throw error;
    
    return data?.map(user => user.id) || [];
  } catch (error) {
    console.error('❌ Failed to get admin user IDs:', error);
    return [];
  }
}

// Export for use in other modules
export { getAdminUserIds };

