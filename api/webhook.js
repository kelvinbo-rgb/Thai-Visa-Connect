// api/webhook.js
// This file is deployed as a Serverless Function on Vercel
// It handles Webhook events from the Line Messaging API

const crypto = require('crypto');

// Configuration (Environment Variables set in Vercel Dashboard)
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

module.exports = async (req, res) => {
    // 1. Validate Signature (Security Check)
    // Line sends a signature in the headers to prove the request is real
    const signature = req.headers['x-line-signature'];
    const body = JSON.stringify(req.body);
    
    // In production, we must verify this hash
    if (CHANNEL_SECRET) {
        const hash = crypto.createHmac('sha256', CHANNEL_SECRET).update(body).digest('base64');
        if (hash !== signature) {
            console.error("Invalid Signature");
            return res.status(401).send('Unauthorized');
        }
    }

    const events = req.body.events;

    try {
        // 2. Process Events
        // We use Promise.all to handle multiple events simultaneously
        await Promise.all(events.map(async (event) => {
            
            // Case A: User follows the bot or joins
            if (event.type === 'follow') {
                console.log(`New user followed: ${event.source.userId}`);
                await replyText(event.replyToken, "Welcome to Thai Visa Connect! 🇹🇭\nPlease open the app to set up your profile.");
            }
            
            // Case B: User sends an image (Passport/Visa)
            else if (event.type === 'message' && event.message.type === 'image') {
                console.log(`Image received from: ${event.source.userId}`);
                // Future Logic:
                // 1. Download image content
                // 2. Send to Google Vision OCR
                // 3. Extract dates
                // 4. Save to Database
                await replyText(event.replyToken, "📷 Processing your document... (OCR Feature Coming Soon)");
            }
            
            // Case C: Postback (Button clicks inside Line)
            else if (event.type === 'postback') {
                const data = event.postback.data;
                console.log(`Postback received: ${data}`);
            }

        }));
        
        // Always return 200 OK to Line
        res.status(200).send('OK');
        
    } catch (err) {
        console.error(err);
        res.status(500).send('Error');
    }
};

// Helper: Send Text Reply
async function replyText(replyToken, text) {
    if (!ACCESS_TOKEN) return; // Skip if no token configured
    
    const fetch = (await import('node-fetch')).default;
    
    await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ACCESS_TOKEN}`
        },
        body: JSON.stringify({
            replyToken: replyToken,
            messages: [{ type: 'text', text: text }]
        })
    });
}