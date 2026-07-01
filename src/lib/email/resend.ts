const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@example.com'
const RESEND_API_URL = 'https://api.resend.com/emails'

interface SendDownloadEmailParams {
  email: string
  productTitle: string
  downloadUrl: string
}

export async function sendDownloadEmail({
  email,
  productTitle,
  downloadUrl,
}: SendDownloadEmailParams): Promise<{ success: boolean; error?: string }> {
  console.log('\n📧 ===== RESEND EMAIL DEBUG =====')
  console.log(`🔑 RESEND_API_KEY exists: ${!!RESEND_API_KEY}`)
  console.log(`📧 FROM_EMAIL: ${FROM_EMAIL}`)
  console.log(`📧 TO_EMAIL: ${email}`)
  console.log(`📋 PRODUCT_TITLE: ${productTitle}`)
  console.log(`🔗 DOWNLOAD_URL: ${downloadUrl?.substring(0, 50)}...`)

  if (!RESEND_API_KEY) {
    console.error('❌ [RESEND] RESEND_API_KEY not configured')
    console.log('📧 ===== END DEBUG =====\n')
    return {
      success: false,
      error: 'Email service not configured',
    }
  }

  try {
    console.log('📧 [RESEND] Building email payload...')

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #fafafa;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 500px;
      margin: 20px auto;
      padding: 30px;
      background-color: white;
      border-radius: 8px;
    }
    .header {
      margin-bottom: 24px;
    }
    h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      line-height: 1.4;
    }
    .content {
      margin-bottom: 24px;
      font-size: 14px;
      line-height: 1.6;
      color: #444;
    }
    .button {
      display: inline-block;
      background-color: #000;
      color: white;
      padding: 12px 32px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 24px 0;
      font-size: 14px;
    }
    .button:hover {
      background-color: #1a1a1a;
    }
    .footer {
      border-top: 1px solid #eee;
      margin-top: 32px;
      padding-top: 16px;
      font-size: 13px;
      color: #888;
    }
    .expiry {
      font-size: 12px;
      color: #999;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your guide is ready</h1>
    </div>

    <div class="content">
      <p>Hi,</p>
      <p>Your copy of <strong>${productTitle}</strong> is ready to download.</p>
      <p><a href="${downloadUrl}" class="button">Download Now</a></p>
      <p class="expiry">This link expires in 1 hour</p>
    </div>

    <div class="footer">
      <p>Questions? Reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `

    const payload = {
      from: FROM_EMAIL,
      to: email,
      subject: 'Your free guide is ready',
      html: htmlContent,
    }

    console.log(`📧 [RESEND] Sending to Resend API: ${RESEND_API_URL}`)
    console.log(`📧 [RESEND] From: ${payload.from}`)
    console.log(`📧 [RESEND] To: ${payload.to}`)
    console.log(`📧 [RESEND] Subject: ${payload.subject}`)

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    console.log(`📧 [RESEND] Response status: ${response.status}`)
    console.log(`📧 [RESEND] Response OK: ${response.ok}`)

    const responseData = await response.json()
    console.log(`📧 [RESEND] Response body:`, JSON.stringify(responseData, null, 2))

    if (!response.ok) {
      console.error('❌ [RESEND] Resend API returned error')
      console.error('❌ [RESEND] Error details:', responseData)
      console.log('📧 ===== END DEBUG =====\n')
      return {
        success: false,
        error: responseData.message || 'Failed to send email. Please try again.',
      }
    }

    console.log(`✅ [RESEND] Email sent successfully!`)
    console.log(`✅ [RESEND] Email ID: ${responseData.id}`)
    console.log(`✅ [RESEND] To: ${email}`)
    console.log(`✅ [RESEND] Subject: Your free guide is ready`)
    console.log('📧 ===== END DEBUG =====\n')
    return { success: true }
  } catch (error) {
    console.error('❌ [RESEND] Exception occurred:', error)
    console.error('❌ [RESEND] Error message:', error instanceof Error ? error.message : String(error))
    console.log('📧 ===== END DEBUG =====\n')
    return {
      success: false,
      error: 'Failed to send email. Please try again.',
    }
  }
}