const sgMail = require('@sendgrid/mail');


sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendVerificationCode = async (toEmail, code) => {
  const msg = {
    to: toEmail,
    from: process.env.EMAIL_FROM, // Use a verified sender from your SendGrid account
    subject: 'Your Expense Tracker Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
        <h2>Welcome to Expense Tracker!</h2>
        <p>Please use the verification code below to complete your registration.</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 5px; padding: 10px; background-color: #f2f2f2; border-radius: 5px;">
          ${code}
        </p>
        <p>This code will expire in 15 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Verification email sent to ${toEmail}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    if (error.response) {
      console.error(error.response.body)
    }
  
  }
};

module.exports = { sendVerificationCode };