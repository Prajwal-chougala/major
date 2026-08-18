const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://chougalaprajwal_db_user:Xnww0k53TPFEVQo1@cluster0.wovlwru.mongodb.net/energyDB?retryWrites=true&w=majority').then(async () => {
  const db = mongoose.connection.db;
  await db.collection('devices').updateMany(
    { status: { $in: ['ON', 'OFF'] } },
    { $set: { status: 'offline' } }
  );
  console.log('Fixed status validation error.');
  process.exit(0);
});
