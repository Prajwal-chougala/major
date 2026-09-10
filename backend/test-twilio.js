require('dotenv').config();
const twilio = require('twilio');

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error("Missing Twilio credentials in .env");
    process.exit(1);
}

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

async function testSMS() {
    try {
        // We'll test sending to the same number just to see the exact Twilio error
        // Or if you want to test sending to a hardcoded number, we could, but let's query the DB for the user's number
        const mongoose = require('mongoose');
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        const User = require('./models/User');
        const user = await User.findOne({ mobile: { $exists: true, $ne: null } }) || await User.findOne({}); // Grab user with mobile
        const targetNumber = user ? (user.mobile || user.mobileNumber) : "+919513156832";
        
        console.log(`Attempting to send SMS from ${TWILIO_PHONE_NUMBER} to ${targetNumber}...`);
        
        const result = await client.messages.create({
            body: "Test SMS from WattWise",
            from: TWILIO_PHONE_NUMBER,
            to: targetNumber
        });
        
        console.log("Success! SID:", result.sid);
        process.exit(0);
    } catch (error) {
        console.error("Twilio Error:", error.message);
        console.error("Twilio Code:", error.code);
        process.exit(1);
    }
}

testSMS();
