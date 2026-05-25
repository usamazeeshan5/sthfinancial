import { readFileSync } from "fs";
import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import mongoose from "mongoose";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI missing");
  process.exit(1);
}

await mongoose.connect(uri);

const NfcChip = mongoose.connection.collection("nfcchips");
const chip = await NfcChip.findOne({
  status: "active",
  customerId: { $ne: null },
});

if (!chip) {
  console.log(JSON.stringify({ found: false }));
} else {
  console.log(
    JSON.stringify({
      found: true,
      chipUid: chip.chipUid,
      customerId: String(chip.customerId),
      customerName: chip.customerName,
      status: chip.status,
    })
  );
}

await mongoose.disconnect();
