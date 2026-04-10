import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";
import NfcChip from "@/lib/models/NfcChip";
import Transaction from "@/lib/models/Transaction";
import Payout from "@/lib/models/Payout";
import FeeConfig from "@/lib/models/FeeConfig";
import AdminUser from "@/lib/models/AdminUser";

export async function POST() {
  await connectDB();

  // Check if already seeded
  const existingCustomers = await Customer.countDocuments();
  if (existingCustomers > 0) {
    return NextResponse.json({ message: "Database already seeded" });
  }

  const hashedPassword = await bcrypt.hash("password123", 12);
  const adminPassword = await bcrypt.hash("admin123", 12);

  // Seed admin user
  await AdminUser.create({
    name: "Admin",
    email: "admin@lovetap.me",
    password: adminPassword,
  });

  // Seed customers
  const customerData = [
    { name: "Marcus Johnson", email: "marcus@email.com", phone: "+1 (555) 123-4567", bankAccountStatus: "disconnected", active: true },
    { name: "Sarah Williams", email: "sarah@email.com", phone: "+1 (555) 234-5678", bankAccountStatus: "disconnected", active: true },
    { name: "David Chen", email: "david@email.com", phone: "+1 (555) 345-6789", bankAccountStatus: "disconnected", active: true },
    { name: "Emily Rodriguez", email: "emily@email.com", phone: "+1 (555) 456-7890", bankAccountStatus: "disconnected", active: true },
    { name: "James Thompson", email: "james@email.com", phone: "+1 (555) 567-8901", bankAccountStatus: "disconnected", active: false },
    { name: "Olivia Martinez", email: "olivia@email.com", phone: "+1 (555) 678-9012", bankAccountStatus: "disconnected", active: true },
    { name: "Daniel Kim", email: "daniel@email.com", phone: "+1 (555) 789-0123", bankAccountStatus: "disconnected", active: true },
    { name: "Sofia Patel", email: "sofia@email.com", phone: "+1 (555) 890-1234", bankAccountStatus: "disconnected", active: true },
  ];

  const customers = await Customer.insertMany(
    customerData.map((c) => ({ ...c, password: hashedPassword }))
  );

  const customerMap = new Map(customers.map((c) => [c.name, c._id]));

  // Seed NFC chips
  const chipData = [
    { chipUid: "04:A2:3B:C1:00:01", customerName: "Marcus Johnson", status: "active" },
    { chipUid: "04:A2:3B:C1:00:02", customerName: "Sarah Williams", status: "active" },
    { chipUid: "04:A2:3B:C1:00:03", customerName: "David Chen", status: "active" },
    { chipUid: "04:A2:3B:C1:00:04", customerName: "Emily Rodriguez", status: "active" },
    { chipUid: "04:A2:3B:C1:00:05", customerName: "James Thompson", status: "disabled" },
    { chipUid: "04:A2:3B:C1:00:06", customerName: "Olivia Martinez", status: "active" },
    { chipUid: "04:A2:3B:C1:00:07", customerName: "Daniel Kim", status: "active" },
    { chipUid: "04:A2:3B:C1:00:08", customerName: null, status: "active" },
    { chipUid: "04:A2:3B:C1:00:09", customerName: null, status: "active" },
    { chipUid: "04:A2:3B:C1:00:10", customerName: "Sofia Patel", status: "lost" },
  ];

  await NfcChip.insertMany(
    chipData.map((c) => ({
      ...c,
      customerId: c.customerName ? customerMap.get(c.customerName) : null,
    }))
  );

  // Seed transactions
  // Available balance = processed/deposited transactions - scheduled/completed payouts
  // Marcus:  $15+$10+$8+$5+$19+$25+$40 = $122, payouts: $57 → balance: $65
  // Sarah:   $25+$20+$16+$30 = $91,          payouts: $41 → balance: $50
  // David:   $45+$35+$15 = $95,               payouts: $0 (failed only) → balance: $95
  // Emily:   $50+$30+$28+$22+$18 = $148,      payouts: $108 → balance: $40
  // Olivia:  $35+$18+$11+$25 = $89,           payouts: $64 → balance: $25
  // Daniel:  $12+$22+$55+$20 = $109,          payouts: $89 → balance: $20
  // Sofia:   $33+$27 = $60,                   payouts: $33 → balance: $27
  const txData = [
    { customerName: "Marcus Johnson", amount: 15.00, fee: 0.89, totalCharged: 15.89, status: "deposited", createdAt: "2026-04-04T14:30:00" },
    { customerName: "Sarah Williams", amount: 25.00, fee: 1.19, totalCharged: 26.19, status: "deposited", createdAt: "2026-04-04T13:15:00" },
    { customerName: "Marcus Johnson", amount: 10.00, fee: 0.74, totalCharged: 10.74, status: "processed", createdAt: "2026-04-04T12:00:00" },
    { customerName: "Emily Rodriguez", amount: 50.00, fee: 1.94, totalCharged: 51.94, status: "deposited", createdAt: "2026-04-04T11:45:00" },
    { customerName: "David Chen", amount: 45.00, fee: 1.79, totalCharged: 46.79, status: "deposited", createdAt: "2026-04-04T10:30:00" },
    { customerName: "Olivia Martinez", amount: 35.00, fee: 1.49, totalCharged: 36.49, status: "deposited", createdAt: "2026-04-03T18:20:00" },
    { customerName: "Daniel Kim", amount: 12.00, fee: 0.80, totalCharged: 12.80, status: "deposited", createdAt: "2026-04-03T16:00:00" },
    { customerName: "Sarah Williams", amount: 20.00, fee: 1.04, totalCharged: 21.04, status: "processed", createdAt: "2026-04-03T14:45:00" },
    { customerName: "Marcus Johnson", amount: 8.00, fee: 0.68, totalCharged: 8.68, status: "deposited", createdAt: "2026-04-03T12:30:00" },
    { customerName: "Emily Rodriguez", amount: 30.00, fee: 1.34, totalCharged: 31.34, status: "deposited", createdAt: "2026-04-03T10:15:00" },
    { customerName: "Olivia Martinez", amount: 18.00, fee: 0.98, totalCharged: 18.98, status: "deposited", createdAt: "2026-04-02T17:00:00" },
    { customerName: "Daniel Kim", amount: 22.00, fee: 1.10, totalCharged: 23.10, status: "processed", createdAt: "2026-04-02T15:30:00" },
    { customerName: "Marcus Johnson", amount: 5.00, fee: 0.59, totalCharged: 5.59, status: "deposited", createdAt: "2026-04-02T13:00:00" },
    { customerName: "David Chen", amount: 35.00, fee: 1.49, totalCharged: 36.49, status: "deposited", createdAt: "2026-04-02T11:45:00" },
    { customerName: "Sarah Williams", amount: 16.00, fee: 0.92, totalCharged: 16.92, status: "deposited", createdAt: "2026-04-01T19:00:00" },
    { customerName: "Emily Rodriguez", amount: 28.00, fee: 1.28, totalCharged: 29.28, status: "deposited", createdAt: "2026-04-01T16:30:00" },
    { customerName: "Sofia Patel", amount: 33.00, fee: 1.43, totalCharged: 34.43, status: "deposited", createdAt: "2026-04-01T14:15:00" },
    { customerName: "Olivia Martinez", amount: 11.00, fee: 0.77, totalCharged: 11.77, status: "deposited", createdAt: "2026-04-01T12:00:00" },
    { customerName: "Daniel Kim", amount: 55.00, fee: 2.09, totalCharged: 57.09, status: "deposited", createdAt: "2026-03-31T18:30:00" },
    { customerName: "Marcus Johnson", amount: 19.00, fee: 1.01, totalCharged: 20.01, status: "deposited", createdAt: "2026-03-31T15:00:00" },
    { customerName: "Marcus Johnson", amount: 25.00, fee: 1.19, totalCharged: 26.19, status: "deposited", createdAt: "2026-04-06T09:00:00" },
    { customerName: "Marcus Johnson", amount: 40.00, fee: 1.64, totalCharged: 41.64, status: "processed", createdAt: "2026-04-07T11:30:00" },
    { customerName: "Sarah Williams", amount: 30.00, fee: 1.34, totalCharged: 31.34, status: "deposited", createdAt: "2026-04-06T14:00:00" },
    { customerName: "Emily Rodriguez", amount: 22.00, fee: 1.10, totalCharged: 23.10, status: "processed", createdAt: "2026-04-06T16:00:00" },
    { customerName: "Emily Rodriguez", amount: 18.00, fee: 0.98, totalCharged: 18.98, status: "deposited", createdAt: "2026-04-07T10:00:00" },
    { customerName: "David Chen", amount: 15.00, fee: 0.89, totalCharged: 15.89, status: "processed", createdAt: "2026-04-06T12:00:00" },
    { customerName: "Olivia Martinez", amount: 25.00, fee: 1.19, totalCharged: 26.19, status: "deposited", createdAt: "2026-04-07T09:30:00" },
    { customerName: "Daniel Kim", amount: 20.00, fee: 1.04, totalCharged: 21.04, status: "deposited", createdAt: "2026-04-07T13:00:00" },
    { customerName: "Sofia Patel", amount: 27.00, fee: 1.25, totalCharged: 28.25, status: "processed", createdAt: "2026-04-07T15:00:00" },
  ];

  await Transaction.insertMany(
    txData.map((t) => ({
      ...t,
      customerId: customerMap.get(t.customerName),
      createdAt: new Date(t.createdAt),
    }))
  );

  // Seed payouts (less than total transactions so customers have available balance)
  const payoutData = [
    { customerName: "Marcus Johnson", amount: 57.00, status: "completed", scheduledAt: "2026-04-04T00:00:00", completedAt: "2026-04-04T08:00:00" },
    { customerName: "Sarah Williams", amount: 41.00, status: "completed", scheduledAt: "2026-04-04T00:00:00", completedAt: "2026-04-04T08:15:00" },
    { customerName: "Emily Rodriguez", amount: 108.00, status: "completed", scheduledAt: "2026-04-04T00:00:00", completedAt: "2026-04-04T08:30:00" },
    { customerName: "Olivia Martinez", amount: 64.00, status: "completed", scheduledAt: "2026-04-03T00:00:00", completedAt: "2026-04-03T08:00:00" },
    { customerName: "Daniel Kim", amount: 89.00, status: "completed", scheduledAt: "2026-04-03T00:00:00", completedAt: "2026-04-03T08:15:00" },
    { customerName: "David Chen", amount: 65.00, status: "failed", scheduledAt: "2026-04-03T00:00:00", completedAt: null },
    { customerName: "Sofia Patel", amount: 33.00, status: "completed", scheduledAt: "2026-04-04T00:00:00", completedAt: "2026-04-04T08:45:00" },
  ];

  await Payout.insertMany(
    payoutData.map((p) => ({
      ...p,
      customerId: customerMap.get(p.customerName),
      scheduledAt: new Date(p.scheduledAt),
      completedAt: p.completedAt ? new Date(p.completedAt) : null,
    }))
  );

  // Seed fee config
  await FeeConfig.create({ flatFee: 0.30, percentageFee: 3.9 });

  return NextResponse.json({ message: "Database seeded successfully" });
}
