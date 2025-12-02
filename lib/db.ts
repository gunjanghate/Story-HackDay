import mongoose from "mongoose";

declare global {
  var _mongooseConnection: { isConnected: boolean } | undefined;
}

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI is not defined in environment variables");
}

if (!global._mongooseConnection) {
  global._mongooseConnection = { isConnected: false };
}

export const connectToDB = async () => {
  if (global._mongooseConnection?.isConnected) {
    console.log("Using existing database connection");
    return;
  }
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI as string);
    global._mongooseConnection = global._mongooseConnection || { isConnected: true };
    global._mongooseConnection.isConnected = true;
    console.log(" MongoDB connected to:", conn.connection.host);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
};
