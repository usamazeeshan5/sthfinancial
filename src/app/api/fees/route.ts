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
  const { flatFee, percentageFee } = await req.json();

  let config = await FeeConfig.findOne();
  if (!config) {
    config = await FeeConfig.create({ flatFee, percentageFee });
  } else {
    config.flatFee = flatFee;
    config.percentageFee = percentageFee;
    await config.save();
  }

  return NextResponse.json(config);
}
