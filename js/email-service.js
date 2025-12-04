// Email Service Helper
// Easy-to-use functions for sending automated emails

/**
 * Send invoice sent email
 */
export async function sendInvoiceSentEmail(invoice, client, companyName = 'Northern Facilities Group') {
  try {
    const { data, error } = await supabase.functions.invoke('send-automated-email', {
      body: {
        emailType: 'invoice_sent',
        recipientEmail: client.email,
        data: {
          invoice: {
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            total_amount: invoice.total_amount,
            due_date: invoice.due_date
          },
          client: {
            name: client.name || client.email,
            email: client.email
          },
          companyName,
          baseUrl: window.location.origin
        }
      }
    })

    if (error) throw error
    return { success: true, ...data }
  } catch (error) {
    console.error('Error sending invoice email:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send payment received email
 */
export async function sendPaymentReceivedEmail(payment, invoice, clientName, clientEmail) {
  try {
    const { data, error } = await supabase.functions.invoke('send-automated-email', {
      body: {
        emailType: 'payment_received',
        recipientEmail: clientEmail,
        data: {
          payment: {
            amount: payment.amount,
            payment_method: payment.payment_method,
            payment_date: payment.payment_date,
            receipt_url: payment.receipt_url
          },
          invoice: {
            invoice_number: invoice?.invoice_number
          },
          clientName,
          baseUrl: window.location.origin
        }
      }
    })

    if (error) throw error
    return { success: true, ...data }
  } catch (error) {
    console.error('Error sending payment email:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send payment reminder email
 */
export async function sendPaymentReminderEmail(invoice, clientName, clientEmail) {
  try {
    const { data, error } = await supabase.functions.invoke('send-automated-email', {
      body: {
        emailType: 'payment_reminder',
        recipientEmail: clientEmail,
        data: {
          invoice: {
            invoice_number: invoice.invoice_number,
            balance_due: invoice.balance_due || invoice.total_amount,
            due_date: invoice.due_date,
            id: invoice.id
          },
          clientName,
          baseUrl: window.location.origin
        }
      }
    })

    if (error) throw error
    return { success: true, ...data }
  } catch (error) {
    console.error('Error sending payment reminder:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send invoice overdue email
 */
export async function sendInvoiceOverdueEmail(invoice, clientName, clientEmail) {
  try {
    const { data, error } = await supabase.functions.invoke('send-automated-email', {
      body: {
        emailType: 'invoice_overdue',
        recipientEmail: clientEmail,
        data: {
          invoice: {
            invoice_number: invoice.invoice_number,
            balance_due: invoice.balance_due || invoice.total_amount,
            due_date: invoice.due_date,
            id: invoice.id
          },
          clientName,
          baseUrl: window.location.origin
        }
      }
    })

    if (error) throw error
    return { success: true, ...data }
  } catch (error) {
    console.error('Error sending overdue email:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send job assigned email
 */
export async function sendJobAssignedEmail(job, site, workerEmail, workerName) {
  try {
    const { data, error } = await supabase.functions.invoke('send-automated-email', {
      body: {
        emailType: 'job_assigned',
        recipientEmail: workerEmail,
        data: {
          job: {
            id: job.id,
            title: job.title,
            scheduled_date: job.scheduled_date,
            priority: job.priority,
            description: job.description
          },
          site: {
            name: site?.name || 'Unknown Site'
          },
          workerName,
          baseUrl: window.location.origin
        }
      }
    })

    if (error) throw error
    return { success: true, ...data }
  } catch (error) {
    console.error('Error sending job assigned email:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send job completed email
 */
export async function sendJobCompletedEmail(job, clientName, clientEmail) {
  try {
    const { data, error } = await supabase.functions.invoke('send-automated-email', {
      body: {
        emailType: 'job_completed',
        recipientEmail: clientEmail,
        data: {
          job: {
            id: job.id,
            title: job.title,
            completed_by: job.completed_by || 'Team Member'
          },
          client: {
            name: clientName
          },
          baseUrl: window.location.origin
        }
      }
    })

    if (error) throw error
    return { success: true, ...data }
  } catch (error) {
    console.error('Error sending job completed email:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send booking created email
 */
export async function sendBookingCreatedEmail(booking, clientName, clientEmail) {
  try {
    const { data, error } = await supabase.functions.invoke('send-automated-email', {
      body: {
        emailType: 'booking_created',
        recipientEmail: clientEmail,
        data: {
          booking: {
            id: booking.id,
            title: booking.title || booking.service_name,
            scheduled_date: booking.scheduled_date,
            scheduled_time: booking.scheduled_time
          },
          client: {
            name: clientName
          },
          baseUrl: window.location.origin
        }
      }
    })

    if (error) throw error
    return { success: true, ...data }
  } catch (error) {
    console.error('Error sending booking email:', error)
    return { success: false, error: error.message }
  }
}

// Export all functions
window.emailService = {
  sendInvoiceSentEmail,
  sendPaymentReceivedEmail,
  sendPaymentReminderEmail,
  sendInvoiceOverdueEmail,
  sendJobAssignedEmail,
  sendJobCompletedEmail,
  sendBookingCreatedEmail
}

