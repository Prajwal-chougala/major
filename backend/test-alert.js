require('dotenv').config();
const mongoose = require('mongoose');
const { sendSmsAlert } = require('./utils/notify');
const User = require('./models/User');

async function testAlert() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to Database.');
    
    const users = await User.find({
      $or: [
        { mobile: { $exists: true, $ne: "" } },
        { mobileNumber: { $exists: true, $ne: "" } }
      ]
    });

    if (!users || users.length === 0) {
      console.log('No registered users with mobile numbers found.');
      process.exit(1);
    }

    console.log(`Found ${users.length} registered user(s) with mobile numbers:\n`);

    for (const user of users) {
      const mobile = user.mobile || user.mobileNumber;
      console.log(`--- Testing user: ${user.name} (${user.email}) ---`);
      console.log(`Registered Mobile Number: ${mobile}`);
      
      const alertMsg = `⚡ WattWise Alert: Test SMS notification for ${user.name}.`;
      const result = await sendSmsAlert(mobile, alertMsg);
      console.log(`Result:`, result);
      console.log('');
    }

    process.exit(0);
  } catch (err) {
    console.error('Test Error:', err);
    process.exit(1);
  }
}
testAlert();
