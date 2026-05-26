// One-off script to set Square sandbox credentials on a Customer.
// Usage (PowerShell):
//   $env:MONGODB_URI="mongodb+srv://..."; node scripts/connect-bank.mjs
//
// Usage (bash):
//   MONGODB_URI="mongodb+srv://..." node scripts/connect-bank.mjs

import mongoose from "mongoose";

const CUSTOMER_ID = "6a147005145d3a1047b8ca54";
const SQUARE_ACCESS_TOKEN =
  "EAAAlwjWf4gr4F32DDPfzoOT0GwH93M1fThl9yK_q1ZFydV5VObzFQ1BfIQVI85z";
const SQUARE_MERCHANT_ID = "MLJEF6A9CA4N4";
const SQUARE_LOCATION_ID = "L94C8J5CPPCJC";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error(
    "MONGODB_URI env var is required. Get it from Vercel → Settings → Environment Variables → MONGODB_URI."
  );
  process.exit(1);
}

console.log("Connecting to MongoDB...");
await mongoose.connect(uri);

const Customer = mongoose.connection.collection("customers");

const result = await Customer.updateOne(
  { _id: new mongoose.Types.ObjectId(CUSTOMER_ID) },
  {
    $set: {
      squareAccessToken: SQUARE_ACCESS_TOKEN,
      squareMerchantId: SQUARE_MERCHANT_ID,
      squareLocationId: SQUARE_LOCATION_ID,
      bankAccountStatus: "connected",
    },
  }
);

if (result.matchedCount === 0) {
  console.error(`❌ No customer found with _id ${CUSTOMER_ID}`);
} else if (result.modifiedCount === 0) {
  console.log(
    `⚠️  Customer ${CUSTOMER_ID} matched but no fields changed (already set?)`
  );
} else {
  console.log(`✅ Updated customer ${CUSTOMER_ID}. Bank is now connected.`);
}

await mongoose.disconnect();
process.exit(0);
