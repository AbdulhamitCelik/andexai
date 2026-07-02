import mongoose from "mongoose";

const PRIMARY_URI = process.env.MONGODB_URI?.trim();
const FALLBACK_URI = process.env.MONGODB_URI_FALLBACK?.trim();

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  activeUri: string | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null, activeUri: null };
global.mongooseCache = cached;

const CONNECT_OPTS = {
  bufferCommands: false,
  serverSelectionTimeoutMS: 8000,
  /** Prefer IPv4 — avoids Atlas whitelist mismatches when Node resolves via IPv6. */
  family: 4 as const,
};

function connectionUris(): string[] {
  const uris = [PRIMARY_URI, FALLBACK_URI].filter((u): u is string => Boolean(u));
  return [...new Set(uris)];
}

function friendlyMongoError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/unable to verify the first certificate|UNABLE_TO_VERIFY_LEAF_SIGNATURE|certificate/i.test(msg)) {
    return [
      "MongoDB TLS certificate verification failed on this machine.",
      "Restart with: npm run dev (scripts now pass --use-system-ca to Node).",
      "Or set NODE_OPTIONS=--use-system-ca before starting the server.",
    ].join(" ");
  }
  if (/whitelist|IP that isn't/i.test(msg)) {
    return [
      "MongoDB Atlas blocked this connection (IP not whitelisted).",
      "In Atlas → Network Access, add your current IP or 0.0.0.0/0 for development.",
      "On Windows, IPv6 can cause false whitelist errors — this app forces IPv4.",
      FALLBACK_URI
        ? "Or start local MongoDB and set MONGODB_URI_FALLBACK in .env.local."
        : "Optional: set MONGODB_URI_FALLBACK=mongodb://127.0.0.1:27017/andexai for local Mongo.",
    ].join(" ");
  }
  if (/ECONNREFUSED|ENOTFOUND|timed out/i.test(msg)) {
    return `MongoDB unreachable: ${msg}`;
  }
  return msg;
}

async function tryConnect(uri: string): Promise<typeof mongoose> {
  return mongoose.connect(uri, CONNECT_OPTS);
}

export async function connectDB(): Promise<typeof mongoose> {
  const uris = connectionUris();
  if (uris.length === 0) {
    throw new Error("MONGODB_URI is not defined. Add it to .env.local");
  }

  if (cached.conn && cached.activeUri) return cached.conn;

  if (!cached.promise) {
    cached.promise = (async () => {
      const errors: string[] = [];
      for (const uri of uris) {
        try {
          const conn = await tryConnect(uri);
          cached.activeUri = uri;
          return conn;
        } catch (err) {
          errors.push(friendlyMongoError(err));
          await mongoose.disconnect().catch(() => {});
        }
      }
      cached.promise = null;
      throw new Error(errors.join(" | "));
    })();
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.conn = null;
    cached.promise = null;
    cached.activeUri = null;
    throw err;
  }
}

export function isDbConfigured(): boolean {
  return connectionUris().length > 0;
}

export function resetDbCache(): void {
  cached.conn = null;
  cached.promise = null;
  cached.activeUri = null;
}
