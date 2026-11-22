const sendEmail = async (options) => {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;

    if (!apiKey) {
        throw new Error('BREVO_API_KEY is not configured.');
    }
    if (!senderEmail) {
        throw new Error('BREVO_SENDER_EMAIL is not configured.');
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'api-key': apiKey,
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            sender: {
                name: process.env.BREVO_SENDER_NAME || 'ExamVault Support',
                email: senderEmail
            },
            to: [{ email: options.email }],
            subject: options.subject,
            htmlContent: options.message
        })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(`Brevo API error (${response.status}): ${JSON.stringify(data)}`);
    }

    console.log('Email sent successfully. Message ID:', data.messageId);
    return data;
};

module.exports = sendEmail;