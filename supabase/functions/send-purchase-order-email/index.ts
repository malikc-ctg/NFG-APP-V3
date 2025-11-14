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
    const { po, supplierEmail, pdfBase64 } = await req.json()

    if (!po || !supplierEmail || !pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing purchase order data, supplier email, or PDF attachment' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'NFG <onboarding@resend.dev>'

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const htmlBody = createPurchaseOrderEmailHTML(po)

    const payload = {
      from: RESEND_FROM_EMAIL,
      to: [supplierEmail],
      subject: `Purchase Order ${po.po_number} from Northern Facilities Group`,
      html: htmlBody,
      attachments: [
        {
          filename: `PO-${po.po_number}.pdf`,
          content: pdfBase64,
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
      console.error('Failed to send purchase order email', data)
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
    console.error('send-purchase-order-email error', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function createPurchaseOrderEmailHTML(po: any) {
  const supplierName = po?.suppliers?.name || 'Supplier'
  const siteName = po?.sites?.name || 'N/A'
  const expected = po?.expected_date ? new Date(po.expected_date).toLocaleDateString() : 'N/A'
  const status = (po?.status || 'pending').toUpperCase()
  const items = po?.purchase_order_items || []

  const itemsRows = items.map((item: any) => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item?.inventory_items?.name || '')}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align:center;">${item.quantity_ordered || 0}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align:right;">$${Number(item.cost_per_unit || 0).toFixed(2)}</td>
    </tr>
  `).join('') || '<tr><td colspan="3" style="padding: 12px; text-align:center; color:#6b7280;">No line items provided.</td></tr>'

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Purchase Order ${po.po_number}</title>
  </head>
  <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f7f9fc; padding: 20px;">
    <table align="center" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 10px 25px rgba(15,23,42,0.08);">
      <tr>
        <td style="background: linear-gradient(135deg, #0D47A1 0%, #0A3A84 100%); padding: 30px;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px;">Northern Facilities Group</h1>
          <p style="color: #e3f2fd; margin: 6px 0 0;">Purchase Order ${po.po_number}</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 30px;">
          <p style="font-size: 16px; color: #111827; margin-top: 0;">Hello ${escapeHtml(supplierName)},</p>
          <p style="font-size: 15px; color: #4b5563;">Please find attached purchase order <strong>${po.po_number}</strong> for site <strong>${escapeHtml(siteName)}</strong>. Kindly confirm the availability and expected delivery schedule.</p>
          <table cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0; border: 1px solid #e5e7eb; border-radius: 8px;">
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><strong>Status</strong></td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${status}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><strong>Expected Date</strong></td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${expected}</td>
            </tr>
            <tr>
              <td style="padding: 12px;"><strong>Site</strong></td>
              <td style="padding: 12px;">${escapeHtml(siteName)}</td>
            </tr>
          </table>
          <h3 style="margin: 30px 0 12px; color: #0f172a;">Order Items</h3>
          <table cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; font-size: 14px;">
            <thead>
              <tr style="background-color: #f1f5f9;">
                <th style="padding: 10px 12px; text-align:left;">Item</th>
                <th style="padding: 10px 12px; text-align:center;">Quantity</th>
                <th style="padding: 10px 12px; text-align:right;">Cost / Unit</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          <p style="margin: 30px 0 0; font-size: 14px; color: #4b5563;">If you have any questions about this order, please reach out to your NFG coordinator.</p>
        </td>
      </tr>
      <tr>
        <td style="background-color: #f8fafc; padding: 18px; text-align:center; font-size: 12px; color: #94a3b8;">
          © ${new Date().getFullYear()} Northern Facilities Group — Professional Facilities Management Solutions
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

