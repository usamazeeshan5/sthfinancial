import { readFileSync } from "fs";
import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import mongoose from "mongoose";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
}

await mongoose.connect(process.env.MONGODB_URI);
const coll = mongoose.connection.collection("transactions");

const before = await coll.indexes();
console.log("BEFORE:", before.map((i) => i.name).join(", "));

try {
  const res = await coll.dropIndex("luqraRefId_1");
  console.log("dropIndex result:", res);
} catch (e) {
  console.error("dropIndex failed:", e?.codeName || e?.message);
}

const after = await coll.indexes();
console.log("AFTER:", after.map((i) => i.name).join(", "));

await mongoose.disconnect();
