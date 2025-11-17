import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { expenseId, expenseData, userEmail, userName, receiptFile } = await req.json()

    if (!expenseData || !userEmail || !userName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: expenseData, userEmail, or userName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Receipt file is optional
    if (!receiptFile) {
      console.log('[Expense Receipt Email] No receipt file provided, sending email without attachment')
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'NFG <onboarding@resend.dev>'

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const htmlBody = createExpenseReceiptEmailHTML(expenseData, expenseId, !!receiptFile)

    const payload: any = {
      from: RESEND_FROM_EMAIL,
      to: [userEmail],
      subject: `Expense Receipt: ${expenseData.description} - $${Number(expenseData.amount || 0).toFixed(2)}`,
      html: htmlBody,
    }

    // Add receipt attachment if provided
    if (receiptFile && receiptFile.content && receiptFile.filename) {
      payload.attachments = [
        {
          filename: receiptFile.filename,
          content: receiptFile.content, // Base64 encoded
        }
      ]
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Failed to send expense receipt email', data)
      return new Response(JSON.stringify({ error: data?.message || 'Failed to send email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('send-expense-receipt-email error', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function createExpenseReceiptEmailHTML(expenseData: any, expenseId?: string, hasReceipt: boolean = false) {
  const description = escapeHtml(expenseData.description || 'N/A')
  const amount = Number(expenseData.amount || 0).toFixed(2)
  const category = expenseData.category ? capitalizeFirst(expenseData.category) : 'N/A'
  const expenseDate = expenseData.expense_date ? new Date(expenseData.expense_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'
  const vendorName = expenseData.vendor_name ? escapeHtml(expenseData.vendor_name) : null
  const notes = expenseData.notes ? escapeHtml(expenseData.notes) : null
  const jobTitle = expenseData.job_title ? escapeHtml(expenseData.job_title) : null
  const siteName = expenseData.site_name ? escapeHtml(expenseData.site_name) : null

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Expense Receipt</title>
  </head>
  <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f7f9fc; padding: 20px;">
    <table align="center" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 10px 25px rgba(15,23,42,0.08);">
      <tr>
        <td style="background: linear-gradient(135deg, #0D47A1 0%, #0A3A84 100%); padding: 30px;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px;">NFG ONE</h1>
          <p style="color: #e3f2fd; margin: 6px 0 0;">Expense Receipt</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 30px;">
          <p style="font-size: 16px; color: #111827; margin-top: 0;">Hello,</p>
          <p style="font-size: 15px; color: #4b5563;">Your expense has been recorded. Please find the details below${hasReceipt ? ' and your receipt attached' : ''}.</p>
          
          <table cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0; border: 1px solid #e5e7eb; border-radius: 8px;">
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; width: 40%;"><strong>Description</strong></td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${description}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><strong>Amount</strong></td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 18px; font-weight: bold; color: #dc2626;">$${amount}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><strong>Category</strong></td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${category}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><strong>Date</strong></td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${expenseDate}</td>
            </tr>
            ${jobTitle ? `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><strong>Job</strong></td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${jobTitle}</td>
            </tr>
            ` : ''}
            ${siteName ? `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><strong>Site</strong></td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${siteName}</td>
            </tr>
            ` : ''}
            ${vendorName ? `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><strong>Vendor</strong></td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${vendorName}</td>
            </tr>
            ` : ''}
            ${notes ? `
            <tr>
              <td style="padding: 12px;"><strong>Notes</strong></td>
              <td style="padding: 12px;">${notes}</td>
            </tr>
            ` : ''}
          </table>
          
          ${hasReceipt ? `
          <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #0c4a6e;">
              <strong>📎 Receipt Attached</strong><br>
              Your receipt has been attached to this email for your records.
            </p>
          </div>
          ` : ''}
          
          <p style="margin: 30px 0 0; font-size: 14px; color: #4b5563;">This expense has been recorded in your NFG ONE account. If you have any questions, please contact your administrator.</p>
        </td>
      </tr>
      <tr>
        <td style="background-color: #f8fafc; padding: 18px; text-align:center; font-size: 12px; color: #94a3b8;">
          © ${new Date().getFullYear()} NFG ONE — WHERE INNOVATION MEETS EXECUTION
        </td>
      </tr>
    </table>
  </body>
  </html>
  `
}

function escapeHtml(text: string) {
  if (!text) return ''
  return text.replace(/[&<>"']/g, (m) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }
    return map[m] || m
  })
}

function capitalizeFirst(str: string) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ')
}

