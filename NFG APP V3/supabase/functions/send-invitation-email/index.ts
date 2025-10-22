// Supabase Edge Function for sending invitation emails
// Deploy this to enable automatic email sending

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
    const { email, role, invitationLink, inviterEmail } = await req.json()

    // Validate inputs
    if (!email || !role || !invitationLink) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create email HTML template
    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #0D47A1 0%, #0A3A84 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #0D47A1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    .role-badge { display: inline-block; background: #E3ECFA; color: #0D47A1; padding: 4px 12px; border-radius: 4px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏢 NFG Facilities Management</h1>
      <p>You've been invited!</p>
    </div>
    <div class="content">
      <h2>Hello!</h2>
      <p>You've been invited by <strong>${inviterEmail || 'your administrator'}</strong> to join the NFG Facilities Management system.</p>
      
      <p>Your assigned role: <span class="role-badge">${role.toUpperCase()}</span></p>
      
      <p><strong>What this means:</strong></p>
      <ul>
        ${role === 'admin' ? '<li>Full system access and management capabilities</li>' : ''}
        ${role === 'client' ? '<li>Manage jobs and staff members</li>' : ''}
        ${role === 'staff' ? '<li>View and complete assigned jobs</li>' : ''}
      </ul>
      
      <p>Click the button below to accept the invitation and set up your account:</p>
      
      <center>
        <a href="${invitationLink}" class="button">Accept Invitation & Set Password</a>
      </center>
      
      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        <strong>Important:</strong> This invitation link expires in 7 days.
      </p>
      
      <p style="color: #666; font-size: 14px;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <code style="background: #e9ecef; padding: 8px; display: block; margin-top: 10px; word-break: break-all;">${invitationLink}</code>
      </p>
      
      <p>If you have any questions, please contact your administrator.</p>
      
      <p>Best regards,<br><strong>Northern Facilities Group Team</strong></p>
    </div>
    <div class="footer">
      <p>© 2025 Northern Facilities Group. All rights reserved.</p>
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `

    // Send email using ZeptoMail (Zoho's transactional email service)
    const ZEPTO_MAIL_KEY = Deno.env.get('ZEPTO_MAIL_KEY')
    const ZEPTO_FROM_EMAIL = Deno.env.get('ZOHO_FROM_EMAIL') || 'noreply@northernfacilitiesgroup.ca'
    const ZEPTO_FROM_NAME = Deno.env.get('ZEPTO_FROM_NAME') || 'NFG Facilities'
    
    if (!ZEPTO_MAIL_KEY) {
      console.warn('ZeptoMail API key not set')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email service not configured. Please set ZEPTO_MAIL_KEY in Edge Function secrets.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Sending email via ZeptoMail...')
    console.log('From:', ZEPTO_FROM_EMAIL, 'To:', email)

    // ZeptoMail API payload
    const emailPayload = {
      from: {
        address: ZEPTO_FROM_EMAIL,
        name: ZEPTO_FROM_NAME
      },
      to: [
        {
          email_address: {
            address: email
          }
        }
      ],
      subject: 'Invitation to join NFG Facilities Management',
      htmlbody: emailHTML
    }

    const emailResponse = await fetch('https://api.zeptomail.ca/v1.1/email', {
      method: 'POST',
      headers: {
        'Authorization': ZEPTO_MAIL_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    })

    console.log('ZeptoMail response status:', emailResponse.status)

    const emailData = await emailResponse.json()

    if (!emailResponse.ok) {
      console.error('ZeptoMail API error:', emailData)
      throw new Error(`Failed to send email: ${emailData.message || emailData.error || 'Unknown error'}`)
    }

    console.log('✅ Email sent successfully via ZeptoMail!', emailData)

    return new Response(
      JSON.stringify({ success: true, messageId: emailData.id }),
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

