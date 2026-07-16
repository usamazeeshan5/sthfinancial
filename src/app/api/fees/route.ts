import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import FeeConfig from "@/lib/models/FeeConfig";

export async function GET() {
  await connectDB();
  let config = await FeeConfig.findOne();
  if (!config) {
    config = await FeeConfig.create({ flatFee: 0.3, percentageFee: 3.9 });
  }
  return NextResponse.json(config);
}

export async function PUT(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const { flatFee, percentageFee, platformPercentageFee, platformFlatFee } = body;

  let config = await FeeConfig.findOne();
  if (!config) config = await FeeConfig.create({});

  if (flatFee !== undefined) config.flatFee = flatFee;
  if (percentageFee !== undefined) config.percentageFee = percentageFee;
  // Platform fee is optional — only update when the field is present so an
  // older client that doesn't send it doesn't reset it to 0.
  if (platformPercentageFee !== undefined)
    config.platformPercentageFee = platformPercentageFee;
  if (platformFlatFee !== undefined) config.platformFlatFee = platformFlatFee;
  await config.save();

  return NextResponse.json(config);
}
