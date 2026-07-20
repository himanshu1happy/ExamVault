const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1. Create a transporter (Bulletproof Gmail IPv4 Configuration for Render)
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',  // 👈 'service: Gmail' hata kar explicit host lagaya
        port: 465,               // 👈 Secure port
        secure: true,            // 👈 465 ke liye true
        family: 4,               // 👈 YEH HAI ASLI HERO! (Forces IPv4, fixes ENETUNREACH)
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