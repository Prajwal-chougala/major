require('dotenv').config();
const mongoose = require('mongoose');
const { sendEmailAlert } = require('./utils/notify');
const User = require('./models/User');

async function testEmailSystem() {
  console.log('--- WattWise Email Notification System Test ---');
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    const users = await User.find({ email: { $exists: true, $ne: "" } });

    if (!users || users.length === 0) {
      console.log('No registered users found.');
      process.exit(1);
    }

    console.log(`Found ${users.length} registered user(s). Testing email delivery...\n`);

    for (const user of users) {
      console.log(`Sending test email alert to: ${user.name} <${user.email}>`);
      
      const subject = `⚡ WattWise Email Test — System Notification`;
      const message = `Hello ${user.name},\n\nThis is a test notification from the WattWise Email Notification System. Your account is actively configured to receive real-time energy threshold and high consumption warnings.`;
      
      const result = await sendEmailAlert(user.email, subject, message);
      console.log(`Delivery Result for ${user.email}:`, result);
      console.log('---------------------------------------------------\n');
    }

    console.log('Email test completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Test Error:', err);
    process.exit(1);
  }
}

testEmailSystem();
