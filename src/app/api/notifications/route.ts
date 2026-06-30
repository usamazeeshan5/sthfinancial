import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";
import Transaction from "@/lib/models/Transaction";
import Payout from "@/lib/models/Payout";

type Notification = {
  id: string;
  type: "customer" | "payout" | "transaction" | "alert";
  title: string;
  message: string;
  createdAt: string;
  href: string;
};

// Builds a live notification feed from recent activity. There's no separate
// notifications collection — events are derived from the customers, payouts,
// and transactions that already exist.
export async function GET() {
  await connectDB();

  const [newCustomers, pendingPayouts, recentTips, failed] = await Promise.all([
    Customer.find().sort({ createdAt: -1 }).limit(8).select("name createdAt"),
    Payout.find({ status: "scheduled" }).sort({ scheduledAt: -1 }).limit(8),
    Transaction.find({ status: { $in: ["processed", "deposited"] } })
      .sort({ createdAt: -1 })
      .limit(8),
    Transaction.find({ status: "failed" }).sort({ createdAt: -1 }).limit(5),
  ]);

  const notifications: Notification[] = [];

  for (const c of newCustomers) {
    notifications.push({
      id: `customer-${c._id}`,
      type: "customer",
      title: "New customer",
      message: `${c.name} created an account`,
      createdAt: (c.createdAt as Date).toISOString(),
      href: `/customers/${c._id}`,
    });
  }

  for (const p of pendingPayouts) {
    notifications.push({
      id: `payout-${p._id}`,
      type: "payout",
      title: "Payout pending",
      message: `${p.customerName} has a payout of $${p.amount.toFixed(2)} awaiting processing`,
      createdAt: (p.scheduledAt as Date).toISOString(),
      href: `/payouts`,
    });
  }

  for (const t of recentTips) {
    notifications.push({
      id: `tx-${t._id}`,
      type: "transaction",
      title: "Tip received",
      message: `${t.customerName} received a $${t.amount.toFixed(2)} tip`,
      createdAt: (t.createdAt as Date).toISOString(),
      href: `/transactions`,
    });
  }

  for (const t of failed) {
    notifications.push({
      id: `txfail-${t._id}`,
      type: "alert",
      title: "Failed transaction",
      message: `A $${t.amount.toFixed(2)} tip for ${t.customerName} failed`,
      createdAt: (t.createdAt as Date).toISOString(),
      href: `/transactions`,
    });
  }

  notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json({ notifications: notifications.slice(0, 20) });
}
