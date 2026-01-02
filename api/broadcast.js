// api/broadcast.js
const mongoose = require('mongoose');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;

// Reuse Schema Definition
let User;
try {
    const userSchema = new mongoose.Schema({
        lineUserId: { type: String, unique: true },
        // ... abbreviated fields for broadcast logic
        nationality: String
    });
    User = mongoose.models.User || mongoose.model('User', userSchema);
} catch (e) {}

// DB Connection
let isConnected = false;
const connectDB = async () => {
    if (isConnected) return;
    if (!MONGODB_URI) return;
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
};

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    
    // In production, add Admin Auth check here (e.g., check for a secret header)
    
    const { message, target } = req.body; // target: 'all', 'visa_expiring', etc.
    
    if (!ACCESS_TOKEN) return res.status(500).json({ error: "Line Token missing" });

    await connectDB();

    try {
        // 1. Find Target Users
        let users = [];
        if (isConnected && User) {
            // Mock logic: fetch actual users from DB
            // users = await User.find({}).select('lineUserId');
            // For MVP demo without DB data, we rely on the Line ID passed from frontend or mock
        }
        
        // 2. Send Push Message (Broadcasting to Line)
        // Note: Free Line accounts have a limit on push messages.
        // For this demo, we will just simulate success response
        // In real app:
        /*
        await fetch('https://api.line.me/v2/bot/message/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ACCESS_TOKEN}` },
            body: JSON.stringify({ messages: [{ type: 'text', text: message }] })
        });
        */

        console.log(`[Broadcast] Sending to ${target}: ${message}`);
        
        return res.status(200).json({ success: true, count: 1240 }); // Mock count
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Broadcast failed" });
    }
};