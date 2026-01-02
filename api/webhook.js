// api/webhook.js
const crypto = require('crypto');
const mongoose = require('mongoose');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Config
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;

// DB Schema
let User;
try {
    const userSchema = new mongoose.Schema({
        lineUserId: { type: String, unique: true },
        displayName: String,
        nationality: String,
        passportNo: String,
        visaExpiry: Date,
        reportDue: Date,
        status: { type: String, default: 'Active' }, // Active, Risk, Expired
        lastInteraction: { type: Date, default: Date.now }
    });
    User = mongoose.models.User || mongoose.model('User', userSchema);
} catch (e) {
    console.error("Schema Error:", e);
}

// DB Connection (Cached for Serverless)
let isConnected = false;
const connectDB = async () => {
    if (isConnected) return;
    if (!MONGODB_URI) {
        console.log("MONGODB_URI not set, skipping DB connect");
        return;
    }
    try {
        await mongoose.connect(MONGODB_URI);
        isConnected = true;
        console.log("MongoDB Connected");
    } catch (err) {
        console.error("MongoDB Connect Error:", err);
    }
};

module.exports = async (req, res) => {
    // 1. Signature Validation
    const signature = req.headers['x-line-signature'];
    const body = JSON.stringify(req.body);
    if (CHANNEL_SECRET) {
        const hash = crypto.createHmac('sha256', CHANNEL_SECRET).update(body).digest('base64');
        if (hash !== signature) return res.status(401).send('Unauthorized');
    }

    await connectDB();
    const events = req.body.events || [];

    try {
        await Promise.all(events.map(async (event) => {
            const userId = event.source.userId;

            // Handle Follow (New User)
            if (event.type === 'follow') {
                if (isConnected && User) {
                    await User.findOneAndUpdate(
                        { lineUserId: userId },
                        { status: 'Active', lastInteraction: new Date() },
                        { upsert: true, new: true }
                    );
                }
                await replyText(event.replyToken, "Welcome to Thai Visa Connect! 🇹🇭\nPlease open the app to setup your profile.", ACCESS_TOKEN);
            }

            // Handle Image (Passport/Visa)
            else if (event.type === 'message' && event.message.type === 'image') {
                // Here we would normally download content and send to OCR
                // For MVP, we just reply
                await replyText(event.replyToken, "📷 Document received. AI is analyzing... (OCR feature coming soon)", ACCESS_TOKEN);
            }
        }));
        res.status(200).send('OK');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error');
    }
};

async function replyText(token, text, accessToken) {
    if (!accessToken) return;
    await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ replyToken: token, messages: [{ type: 'text', text }] })
    });
}