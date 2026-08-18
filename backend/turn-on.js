require('dotenv').config();
const mongoose = require('mongoose');

async function turnOn() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const Device = require('./models/Device');
        
        await Device.updateMany({}, { status: 'ON' });
        console.log('All devices turned ON!');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

turnOn();
