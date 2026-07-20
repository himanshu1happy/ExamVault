// 🚀 Brevo HTTP API: Bypasses Render Firewall & Sends OTP to ALL Users Worldwide!
const sendEmail = async (options) => {
    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { 
                    name: "ExamVault Support", 
                    email: "himanshubkb@gmail.com" // 👈 Tumhari Verified Gmail ID
                },
                to: [{ email: options.email }], // 👈 KISI KI BHI EMAIL HO, CHALA JAYEGA!
                subject: options.subject,
                htmlContent: options.message
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Brevo API Error: ${JSON.stringify(data)}`);
        }
        
        console.log("✅ Email sent successfully to ALL users! Message ID:", data.messageId);
        return data;
    } catch (error) {
        console.error("❌ Email sending error:", error);
        throw new Error("Could not send email via Brevo API");
    }
};

module.exports = sendEmail;