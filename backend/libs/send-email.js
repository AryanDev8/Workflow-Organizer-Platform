// backend/libs/send-email.js
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();

sgMail.setApiKey(process.env.SEND_GRID_API);

const fromEmail = process.env.FROM_EMAIL;

export const sendEmail = async (to, subject, html) => {
  const msg = {
    to,
    from: `TaskHub <${fromEmail}>`,  // must be verified in SendGrid
    subject,
    html,
  };

  try {
    const response = await sgMail.send(msg);

    // SendGrid returns an array; first element contains statusCode & headers
    const status = response?.[0]?.statusCode || null;

    console.log("[mail] Email sent. Status:", status);

    return {
      ok: true,
      status,
      headers: response?.[0]?.headers || {},
    };
  } catch (error) {
    const sgError = error?.response?.body || error?.message || error;
    console.error("[mail] Error sending email:", sgError);

    return {
      ok: false,
      error: sgError,
    };
  }
};
