const { Resend } = require('resend');

// Render ke environment se automatic API key utha lega
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
    try {
        // 🚀 HTTP API ke zariye email bhejega (No SMTP Port needed, Firewall bypassed!)
        const data = await resend.emails.send({
            from: 'ExamVault Support <onboarding@resend.dev>', // Free testing sender
            to: options.email,
            subject: options.subject,
            html: options.message
        });
        
        console.log("Email sent successfully via Resend ID:", data.id);
        return data;
    } catch (error) {
        console.error("Resend Email Error:", error);
        throw new Error("Could not send email via Resend API");
    }
};

module.exports = sendEmail;