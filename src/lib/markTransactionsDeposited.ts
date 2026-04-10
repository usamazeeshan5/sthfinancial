import Transaction from "@/lib/models/Transaction";

/**
 * Marks a customer's oldest "processed" transactions as "deposited"
 * using FIFO ordering, up to the specified payout amount.
 */
export async function markTransactionsDeposited(
  customerId: string,
  payoutAmount: number
): Promise<number> {
  const processedTransactions = await Transaction.find({
    customerId,
    status: "processed",
  }).sort({ createdAt: 1 });

  let remaining = payoutAmount;
  const idsToUpdate: string[] = [];

  for (const txn of processedTransactions) {
    if (remaining <= 0) break;
    idsToUpdate.push(txn._id.toString());
    remaining -= txn.amount;
  }

  if (idsToUpdate.length > 0) {
    await Transaction.updateMany(
      { _id: { $in: idsToUpdate } },
      { $set: { status: "deposited" } }
    );
  }

  return idsToUpdate.length;
}
