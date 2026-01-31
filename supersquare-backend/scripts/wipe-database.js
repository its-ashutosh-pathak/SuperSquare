// Script to delete all users from MongoDB
// Run this once to wipe all user data for a fresh start

const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Delete all users
        const result = await mongoose.connection.db.collection('users').deleteMany({});
        console.log(`🗑️  Deleted ${result.deletedCount} users`);

        // Also clear game history if you have it
        try {
            const gameResult = await mongoose.connection.db.collection('games').deleteMany({});
            console.log(`🗑️  Deleted ${gameResult.deletedCount} games`);
        } catch (err) {
            console.log('ℹ️  No games collection found (or already empty)');
        }

        console.log('✨ Database completely wiped! Fresh start ready.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

connectDB();
