require('dotenv').config();
const mongoose = require('mongoose');

async function fixNumber() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        const User = require('./models/User');
        
        const user = await User.findOne();
        if (user) {
            // Remove any quotes and non-digit characters, and add +91 if missing
            let rawNumber = user.mobileNumber.replace(/[^0-9+]/g, '');
            if (!rawNumber.startsWith('+')) {
                // This migration expects an Indian mobile number.
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
