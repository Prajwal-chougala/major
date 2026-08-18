require('dotenv').config();
const mongoose = require('mongoose');

async function fixNumber() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const User = require('./models/User');
        
        const user = await User.findOne();
        if (user) {
            // Remove any quotes and non-digit characters, and add +91 if missing
            let rawNumber = user.mobileNumber.replace(/[^0-9+]/g, '');
            if (!rawNumber.startsWith('+')) {
                // Assuming it's an Indian number based on the Twilio sender number (+919880331429)
                rawNumber = '+91' + rawNumber;
            }
            
            console.log(`Updating mobile number from ${user.mobileNumber} to ${rawNumber}`);
            user.mobileNumber = rawNumber;
            await user.save();
            console.log('Successfully updated!');
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

fixNumber();
