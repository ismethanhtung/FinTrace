import { MongoClient, type MongoClientOptions } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var __fintraceMongoClientPromise: Promise<MongoClient> | undefined;
}

/** Default IPv4: avoids common Atlas TLS failures when IPv6 routes are broken. Set MONGODB_DNS_LOOKUP_FAMILY=auto or 6 to override. */
function mongoDnsFamily(): 4 | 6 | undefined {
  const raw = process.env.MONGODB_DNS_LOOKUP_FAMILY?.trim().toLowerCase();
  if (raw === "auto") return undefined;
  if (raw === "6") return 6;
  return 4;
}

function createClientPromise(): Promise<MongoClient> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    return Promise.reject(
      new Error("Missing MONGODB_URI environment variable"),
    );
  }
  const options: MongoClientOptions = {
    maxPoolSize: 20,
    minPoolSize: 1,
    retryWrites: true,
  };
  const family = mongoDnsFamily();
  if (family !== undefined) {
    options.family = family;
  }
  const client = new MongoClient(mongoUri, options);
  return client.connect();
}

export const mongoClientPromise =
  global.__fintraceMongoClientPromise ?? createClientPromise();

if (process.env.NODE_ENV !== "production") {
  global.__fintraceMongoClientPromise = mongoClientPromise;
}
