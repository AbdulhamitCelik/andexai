// Deep MongoDB diagnostics — npm run test:mongo:diag
import mongoose from "mongoose";
import net from "net";
import dns from "dns/promises";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.log("MONGODB_URI not set");
  process.exit(1);
}

const host = "cluster0.fvrp610.mongodb.net";

console.log("=== MongoDB diagnostics ===\n");

// 1. Public IP
try {
  const ip = await fetch("https://api.ipify.org").then((r) => r.text());
  console.log("Your public IP:", ip.trim());
} catch {
  console.log("Could not fetch public IP");
}

// 2. DNS
try {
  const srv = await dns.resolveSrv("_mongodb._tcp." + host);
  console.log("\nSRV records:", srv.length);
  for (const r of srv) {
    console.log(`  ${r.name}:${r.port}`);
  }

  const shard = srv[0]?.name;
  if (shard) {
    const addrs = await dns.lookup(shard, { all: true });
    console.log(`\nResolved ${shard}:`);
    for (const a of addrs) console.log(`  ${a.address} (${a.family === 6 ? "IPv6" : "IPv4"})`);
  }
} catch (e) {
  console.log("DNS error:", e.message);
}

// 3. TCP reachability to first shard
const shardHost = "ac-qgaclm6-shard-00-00.fvrp610.mongodb.net";
for (const family of [4, 6]) {
  await new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      console.log(`\nTCP ${shardHost}:27017 (IPv${family === 4 ? 4 : 6}): TIMEOUT`);
      resolve(null);
    }, 8000);
    socket.once("connect", () => {
      clearTimeout(timer);
      console.log(`\nTCP ${shardHost}:27017 (IPv${family === 4 ? 4 : 6}): REACHABLE`);
      socket.destroy();
      resolve(null);
    });
    socket.once("error", (err) => {
      clearTimeout(timer);
      console.log(`\nTCP ${shardHost}:27017 (IPv${family === 4 ? 4 : 6}): ${err.message}`);
      resolve(null);
    });
    socket.connect({ host: shardHost, port: 27017, family });
  });
}

// 4. Mongoose attempts
const attempts = [
  { name: "SRV + IPv4 forced", opts: { family: 4 } },
  { name: "SRV + default DNS", opts: {} },
  { name: "SRV + IPv6 forced", opts: { family: 6 } },
];

console.log("\n--- Mongoose connection attempts ---");
for (const { name, opts } of attempts) {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 12000, ...opts });
    console.log(`✅ ${name}: connected to ${mongoose.connection.host}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.log(`❌ ${name}: ${e.message.split("\n")[0]}`);
    await mongoose.disconnect().catch(() => {});
  }
}

process.exit(1);
