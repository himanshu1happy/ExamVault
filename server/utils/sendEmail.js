const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1. Create a transporter (Gmail configuration)
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    // 2. Define the email options
    const mailOptions = {
        from: `ExamVault Support <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        html: options.message // HTML allow karenge taaki OTP sundar dikhe
    };

    // 3. Actually send the email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;