import dns from "dns/promises";
import { MongoClient, Db } from "mongodb";

// Use Google DNS for SRV resolution — Windows resolver often blocks SRV records
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const srvUri = process.env.MONGODB_URI!;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/**
 * Manually resolve mongodb+srv:// into a direct mongodb:// URI.
 * This bypasses the MongoDB driver's own SRV resolution which fails
 * on Windows due to TCP/53 being blocked by the local resolver.
 */
async function resolveDirectUri(uri: string): Promise<string> {
  const url = new URL(uri);
  const hostname = url.hostname;

  const [srvRecords, txtRecords] = await Promise.all([
    dns.resolveSrv(`_mongodb._tcp.${hostname}`),
    dns.resolveTxt(hostname).catch(() => [] as string[][]),
  ]);

  const hosts = srvRecords.map((r) => `${r.name}:${r.port}`).join(",");
  const txtOptions = txtRecords.flat().find((r) => r.includes("authSource")) ?? "authSource=admin";
  const dbName = url.pathname.slice(1) || "hr_agent";
  const creds = `${url.username}:${url.password}`;

  return `mongodb://${creds}@${hosts}/${dbName}?${txtOptions}&tls=true`;
}

async function makeClientPromise(): Promise<MongoClient> {
  const directUri = await resolveDirectUri(srvUri);
  return new MongoClient(directUri).connect();
}

const clientPromise: Promise<MongoClient> =
  process.env.NODE_ENV === "development"
    ? (global._mongoClientPromise ??= makeClientPromise())
    : makeClientPromise();

export async function getDb(): Promise<Db> {
  try {
    const client = await clientPromise;
    return client.db("hr_agent");
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      global._mongoClientPromise = undefined;
    }
    throw err;
  }
}
