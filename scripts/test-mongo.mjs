// Quick MongoDB connection test — loads .env.local
// Run: npm run test:mongo

import mongoose from "mongoose";

const uris = [process.env.MONGODB_URI, process.env.MONGODB_URI_FALLBACK].filter(Boolean);

function mask(uri) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
}

if (uris.length === 0) {
  console.log("No MONGODB_URI or MONGODB_URI_FALLBACK set in .env.local");
  process.exit(1);
}

for (const uri of uris) {
  console.log(`\nTesting: ${mask(uri)}`);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, family: 4 });
    const dbName = mongoose.connection.db.databaseName;
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`✅ Connected to database "${dbName}" (${collections.length} collections)`);
    if (collections.length > 0) {
      console.log(`   Collections: ${collections.map((c) => c.name).join(", ")}`);
    }
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.log(`❌ ${err.message}`);
    await mongoose.disconnect().catch(() => {});
  }
}

console.log("\nAll connection attempts failed.");
process.exit(1);
