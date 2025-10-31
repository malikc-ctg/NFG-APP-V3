// Supabase Edge Function for sending notification emails
// Called automatically when notifications are created

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get request body
    const { notification, user_email } = await req.json()

    // Validate inputs
    if (!notification || !notification.user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing notification data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user preferences
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: preferences, error: prefError } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', notification.user_id)
      .single()

    if (prefError || !preferences) {
      console.warn('No preferences found, using defaults')
    }

    const shouldSendEmail = preferences?.email_enabled !== false && preferences?.[notification.type] !== false

    const results = {
      email: null,
      errors: []
    }

    // ==========================================
    // SEND EMAIL
    // ==========================================
    if (shouldSendEmail && user_email) {
      try {
        const emailHTML = createNotificationEmailHTML(notification)

        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
        const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'NFG <onboarding@resend.dev>'

        if (RESEND_API_KEY) {
          const emailPayload = {
            from: RESEND_FROM_EMAIL,
            to: [user_email],
            subject: notification.title || 'New Notification from NFG',
            html: emailHTML
          }

          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailPayload)
          })

          const emailData = await emailResponse.json()

          if (emailResponse.ok) {
            results.email = { success: true, messageId: emailData.id }
            console.log('✅ Email sent successfully:', emailData.id)
          } else {
            results.errors.push(`Email failed: ${emailData.message || 'Unknown error'}`)
            console.error('❌ Email send failed:', emailData)
          }
        } else {
          results.errors.push('RESEND_API_KEY not configured')
        }
      } catch (error) {
        results.errors.push(`Email error: ${error.message}`)
        console.error('❌ Email send error:', error)
      }
    }


    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function createNotificationEmailHTML(notification: any): string {
  const NFG_LOGO_URL = 'https://zqcbldgheimqrnqmbbed.supabase.co/storage/v1/object/sign/app-images/2.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xN2RmNDhlMi0xNGJlLTQ5NzMtODZlNy0zZTc0MjgzMWIzOTQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhcHAtaW1hZ2VzLzIucG5nIiwiaWF0IjoxNzYxODY2MTE0LCJleHAiOjQ4ODM5MzAxMTR9.E1JoQZxqPy0HOKna6YfjPCfin5Pc3QF0paEV7qzVfDw'

  const typeIcons: Record<string, string> = {
    job_assigned: '📋',
    job_completed: '✅',
    job_updated: '📝',
    booking_created: '📅',
    booking_updated: '🔄',
    booking_cancelled: '❌',
    mention: '💬',
    system: '🔔'
  }

  const typeColors: Record<string, string> = {
    job_assigned: '#2563eb',
    job_completed: '#059669',
    job_updated: '#d97706',
    booking_created: '#6366f1',
    booking_updated: '#7c3aed',
    booking_cancelled: '#dc2626',
    mention: '#db2777',
    system: '#6b7280'
  }

  const icon = typeIcons[notification.type] || '🔔'
  const color = typeColors[notification.type] || '#0D47A1'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NFG Notification</title>
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #0D47A1 0%, #0A3A84 100%); padding: 40px 30px; text-align: center; }
    .logo { max-width: 250px; height: auto; margin-bottom: 20px; }
    .content { padding: 40px 30px; line-height: 1.6; color: #333333; }
    .notification-icon { width: 60px; height: 60px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 30px; margin: 0 auto 20px; background: ${color}20; }
    .notification-title { font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 16px 0; text-align: center; }
    .notification-message { font-size: 16px; color: #4b5563; margin: 0 0 30px 0; }
    .button-container { text-align: center; margin: 35px 0; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #0D47A1 0%, #0A3A84 100%); color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 700; box-shadow: 0 4px 14px rgba(13, 71, 161, 0.25); }
    .footer { background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef; }
    .footer-text { font-size: 13px; color: #6c757d; margin: 5px 0; }
  </style>
</head>
<body>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0; padding: 20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" class="email-container" style="max-width: 600px; background-color: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 12px; overflow: hidden;">
          <tr>
            <td class="header">
              <img src="${NFG_LOGO_URL}" alt="Northern Facilities Group" class="logo" style="max-width: 250px; height: auto; margin-bottom: 20px;">
            </td>
          </tr>
          <tr>
            <td class="content">
              <div class="notification-icon" style="background: ${color}20;">
                ${icon}
              </div>
              <h1 class="notification-title">${escapeHtml(notification.title)}</h1>
              <p class="notification-message">${escapeHtml(notification.message)}</p>
              ${notification.link ? `
              <div class="button-container">
                <a href="${notification.link}" class="cta-button">View Details →</a>
              </div>
              ` : ''}
            </td>
          </tr>
          <tr>
            <td class="footer">
              <p class="footer-text" style="font-weight: 700; color: #0D47A1; font-size: 18px; margin-bottom: 8px;">Northern Facilities Group</p>
              <p class="footer-text">Professional Facilities Management Solutions</p>
              <p class="footer-text" style="margin-top: 20px; font-size: 11px; color: #999999;">© 2025 Northern Facilities Group. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

