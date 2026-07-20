const nodemailer = require('nodemailer');
const dns = require('dns');

const sendEmail = async (options) => {
    // 🚀 The Ultimate Node 24 + Render Bulletproof Configuration:
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        family: 4,                  // 👈 1. Force IPv4
        autoSelectFamily: false,    // 👈 2. KILL-SWITCH 1: Node 24 ke "Happy Eyeballs" ko band karta hai!
        lookup: (hostname, options, callback) => {
            // 👈 3. KILL-SWITCH 2: DNS ko strictly block karta hai IPv6 dhoondhne se!
            options = options || {};
            options.family = 4;
            dns.lookup(hostname, options, callback);
        },
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        },
        connectionTimeout: 10000
    });

    // Define the email options
    const mailOptions = {
        from: `ExamVault Support <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        html: options.message
    };

    // Actually send the email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;