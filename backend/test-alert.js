require('dotenv').config();
const mongoose = require('mongoose');
const { sendSmsAlert } = require('./utils/notify');
const User = require('./models/User');

async function testAlert() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB.');
    const user = await User.findOne({});
    if (!user) { console.log('No user found'); process.exit(1); }
    
    const mobile = user.mobile || user.mobileNumber;
    console.log('Attempting to send SMS to: ' + mobile);
    const result = await sendSmsAlert(mobile, 'WattWise TEST ALERT: Simulated limit exceeded.');
    console.log(result);
    process.exit(0);
  } catch (err) { console.error(err); process.exit(1); }
}
testAlert();
