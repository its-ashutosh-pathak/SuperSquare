import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI || '';
        if (!uri) {
            console.error('MONGO_URI is not defined in .env');
            process.exit(1);
        }

        const conn = await mongoose.connect(uri);
        console.log(`MongoDB connected: ${conn.connection.host}`);
    } catch (error: any) {
        console.error(`\n❌ MongoDB Connection Error: ${error.message}`);

        if (error.code === 'ENOTFOUND') {
            console.error(`👉 Suggestion: Check your internet connection or DNS. The host '${process.env.MONGO_URI}' could not be resolved.`);
        } else if (error.message.includes('whitelisted') || error.message.includes('Could not connect to any servers')) {
            console.error(`
👉 ACTION REQUIRED: IP Whitelist Blocked
   You are likely trying to connect from an IP address that is not whitelisted in MongoDB Atlas.
   
   1. Go to MongoDB Atlas Dashboard -> Network Access.
   2. Add your current IP address (or 0.0.0.0/0 for global development access).
   3. Wait a minute and restart the server.
`);
        } else {
            console.error(`👉 Suggestion: Check if your MONGO_URI in .env is correct and includes the database name.`);
        }

        process.exit(1);
    }
};

export default connectDB;
