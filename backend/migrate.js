const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://chougalaprajwal_db_user:Xnww0k53TPFEVQo1@cluster0.wovlwru.mongodb.net/energyDB?retryWrites=true&w=majority').then(async () => {
  const db = mongoose.connection.db;
  const devices = await db.collection('devices').find({}).toArray();
  for (let d of devices) {
    await db.collection('devices').updateOne(
      { _id: d._id },
      { $set: { deviceId: d._id.toString(), powerState: d.status || 'OFF' } }
    );
  }
  console.log('Migration complete.');
  process.exit(0);
});
