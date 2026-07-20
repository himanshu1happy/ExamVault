const nodemailer = require('nodemailer');
const dns = require('dns'); // 👈 1. Node ka internal DNS module bulaya

// 🚀 2. THE MASTER OVERRIDE: Node.js ko zabardasti bolo ki hamesha IPv4 pehle use kare!
// Is line ke baad kabhi zindagi me 'ENETUNREACH 2404:...' wala error nahi aayega!
dns.setDefaultResultOrder('ipv4first');

const sendEmail = async (options) => {
    // 3. Create a transporter
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,               
        secure: false,           
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        },
        connectionTimeout: 10000 
    });

    // 4. Define the email options
    const mailOptions = {
        from: `ExamVault Support <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        html: options.message 
    };

    // 5. Actually send the email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;