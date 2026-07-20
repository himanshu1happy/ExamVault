const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1. Create a transporter (Cloud Bulletproof Setup with Port 587 & STARTTLS)
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,               // 👈 465 ko hata kar 587 lagaya (Firewall bypass!)
        secure: false,           // 👈 IMPORTANT: Port 587 ke liye isko 'false' rakhna zaroori hai
        family: 4,               // 👈 IPv4 force karne ke liye (is ko mat hatana)
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false // 👈 Cloud server ke SSL certificates ko bypass karne ke liye
        },
        connectionTimeout: 10000 // 👈 10 second se zyada hang nahi hone dega
    });

    // 2. Define the email options
    const mailOptions = {
        from: `ExamVault Support <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        html: options.message 
    };

    // 3. Actually send the email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;