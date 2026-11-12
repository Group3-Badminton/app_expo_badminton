// Cấu hình EmailJS đồng bộ với bản Web (web_react_badmintion)
const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';
const EMAILJS_SERVICE_ID = 'service_ugdo9iz';
const EMAILJS_TEMPLATE_ID = 'template_8bwu5in';
const EMAILJS_PUBLIC_KEY = 'xWKN2ZcMfxpmGDmHA';


export const sendOtpEmail = async ({ recipientEmail, recipientName, otp, otpExpiry }) => {
  const expiryDate = otpExpiry
    ? new Date(otpExpiry)
    : new Date(Date.now() + 10 * 60 * 1000);

  const expiryTime = expiryDate.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const response = await fetch(EMAILJS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        email: recipientEmail,
        user_name: recipientName || 'Quý khách',
        otp: String(otp),
        time: expiryTime,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(errorText || `Gửi email thất bại (HTTP ${response.status}).`);
  }
};
