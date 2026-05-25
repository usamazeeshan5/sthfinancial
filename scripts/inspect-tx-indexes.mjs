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
const indexes = await mongoose.connection.collection("transactions").indexes();
console.log(JSON.stringify(indexes, null, 2));

const nullCount = await mongoose.connection.collection("transactions").countDocuments({ luqraRefId: null });
const totalCount = await mongoose.connection.collection("transactions").countDocuments({});
console.log("docs with luqraRefId=null:", nullCount, "/ total:", totalCount);

await mongoose.disconnect();
