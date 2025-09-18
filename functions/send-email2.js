const nodemailer = require('nodemailer')

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const params = new URLSearchParams(event.body)
  const token = params.get('recaptchaToken') // ✅ get token

  // 🔹 Verify with Google
  const secret = process.env.RECAPTCHA_SECRET // keep in Netlify env
  const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`
  const verifyRes = await fetch(verifyURL, { method: 'POST' })
  const verifyData = await verifyRes.json()

  console.log('reCAPTCHA verify:', verifyData)

  if (!verifyData.success || verifyData.score < 0.5) {
    return { statusCode: 400, body: 'reCAPTCHA failed. Please try again.' }
  }

  const name = params.get('dzName')
  const email = params.get('dzEmail')
  const phone = params.get('dzNum')
  const datetime = params.get('dzOther[DateTime]')
  //   const doctorName = params.get('dzOther[DoctorName]')
  const service = params.get('dzService')
  const honeypot = params.get('website')

  if (honeypot) {
    return { statusCode: 400, body: 'Spam detected' }
  }

  if (
    !name ||
    !/^[A-Za-z\s]{3,50}$/.test(name) ||
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !phone ||
    !/^\d{10}$/.test(phone) ||
    !datetime ||
    !service
  ) {
    return { statusCode: 400, body: 'Invalid form submission' }
  }

  // ✅ Use Gmail SMTP
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'radiology.primediagnostics@gmail.com',
      pass: 'aswb oodp grco uyvk'
    }
  })

  const mailOptions = {
    from: 'radiology.primediagnostics@gmail.com',
    to: 'radiology.primediagnostics@gmail.com',

    subject: `Appointment for ${service} - ${name}`,
    html: `
      <h2>New Appointment Request</h2>
  <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; font-family: Arial, sans-serif;">
    <tr>
      <th align="left">Name</th>
      <td>${name}</td>
    </tr>
    <tr>
      <th align="left">Email</th>
      <td>${email}</td>
    </tr>
    <tr>
      <th align="left">Phone</th>
      <td>${phone}</td>
    </tr>
    <tr>
      <th align="left">Date & Time</th>
      <td>${datetime}</td>
    </tr>
    <tr>
      <th align="left">Service</th>
      <td>${service}</td>
    </tr>
  </table>
    `
  }

  try {
    await transporter.sendMail(mailOptions)

    return {
      statusCode: 302,
      headers: {
        Location: '/thank-you.html'
      },
      body: ''
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: `Email send failed: ${error.message}`
    }
  }
}
