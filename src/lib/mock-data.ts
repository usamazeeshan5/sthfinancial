export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  bankAccountStatus: "connected" | "pending" | "disconnected";
  active: boolean;
  createdAt: string;
};

export type NfcChip = {
  id: string;
  chipUid: string;
  customerId: string | null;
  customerName: string | null;
  status: "active" | "disabled" | "lost";
  registeredAt: string;
};

export type Transaction = {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  fee: number;
  totalCharged: number;
  status: "pending" | "processed" | "deposited" | "failed";
  luqraRefId: string;
  createdAt: string;
};

export type Payout = {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  status: "scheduled" | "completed" | "failed";
  scheduledAt: string;
  completedAt: string | null;
};

export type FeeConfig = {
  flatFee: number;
  percentageFee: number;
  updatedAt: string;
};

// --- Mock Data ---

export const customers: Customer[] = [
  { id: "cust_001", name: "Marcus Johnson", email: "marcus@email.com", phone: "+1 (555) 123-4567", bankAccountStatus: "connected", active: true, createdAt: "2026-01-15" },
  { id: "cust_002", name: "Sarah Williams", email: "sarah@email.com", phone: "+1 (555) 234-5678", bankAccountStatus: "connected", active: true, createdAt: "2026-01-20" },
  { id: "cust_003", name: "David Chen", email: "david@email.com", phone: "+1 (555) 345-6789", bankAccountStatus: "pending", active: true, createdAt: "2026-02-01" },
  { id: "cust_004", name: "Emily Rodriguez", email: "emily@email.com", phone: "+1 (555) 456-7890", bankAccountStatus: "connected", active: true, createdAt: "2026-02-10" },
  { id: "cust_005", name: "James Thompson", email: "james@email.com", phone: "+1 (555) 567-8901", bankAccountStatus: "disconnected", active: false, createdAt: "2026-02-15" },
  { id: "cust_006", name: "Olivia Martinez", email: "olivia@email.com", phone: "+1 (555) 678-9012", bankAccountStatus: "connected", active: true, createdAt: "2026-02-28" },
  { id: "cust_007", name: "Daniel Kim", email: "daniel@email.com", phone: "+1 (555) 789-0123", bankAccountStatus: "connected", active: true, createdAt: "2026-03-05" },
  { id: "cust_008", name: "Sofia Patel", email: "sofia@email.com", phone: "+1 (555) 890-1234", bankAccountStatus: "pending", active: true, createdAt: "2026-03-12" },
];

export const nfcChips: NfcChip[] = [
  { id: "nfc_001", chipUid: "04:A2:3B:C1:00:01", customerId: "cust_001", customerName: "Marcus Johnson", status: "active", registeredAt: "2026-01-16" },
  { id: "nfc_002", chipUid: "04:A2:3B:C1:00:02", customerId: "cust_002", customerName: "Sarah Williams", status: "active", registeredAt: "2026-01-21" },
  { id: "nfc_003", chipUid: "04:A2:3B:C1:00:03", customerId: "cust_003", customerName: "David Chen", status: "active", registeredAt: "2026-02-02" },
  { id: "nfc_004", chipUid: "04:A2:3B:C1:00:04", customerId: "cust_004", customerName: "Emily Rodriguez", status: "active", registeredAt: "2026-02-11" },
  { id: "nfc_005", chipUid: "04:A2:3B:C1:00:05", customerId: "cust_005", customerName: "James Thompson", status: "disabled", registeredAt: "2026-02-16" },
  { id: "nfc_006", chipUid: "04:A2:3B:C1:00:06", customerId: "cust_006", customerName: "Olivia Martinez", status: "active", registeredAt: "2026-03-01" },
  { id: "nfc_007", chipUid: "04:A2:3B:C1:00:07", customerId: "cust_007", customerName: "Daniel Kim", status: "active", registeredAt: "2026-03-06" },
  { id: "nfc_008", chipUid: "04:A2:3B:C1:00:08", customerId: null, customerName: null, status: "active", registeredAt: "2026-03-15" },
  { id: "nfc_009", chipUid: "04:A2:3B:C1:00:09", customerId: null, customerName: null, status: "active", registeredAt: "2026-03-20" },
  { id: "nfc_010", chipUid: "04:A2:3B:C1:00:10", customerId: "cust_008", customerName: "Sofia Patel", status: "lost", registeredAt: "2026-03-13" },
];

export const transactions: Transaction[] = [
  { id: "txn_001", customerId: "cust_001", customerName: "Marcus Johnson", amount: 15.00, fee: 0.89, totalCharged: 15.89, status: "deposited", luqraRefId: "LQ-2026-00001", createdAt: "2026-04-04T14:30:00" },
  { id: "txn_002", customerId: "cust_002", customerName: "Sarah Williams", amount: 25.00, fee: 1.19, totalCharged: 26.19, status: "deposited", luqraRefId: "LQ-2026-00002", createdAt: "2026-04-04T13:15:00" },
  { id: "txn_003", customerId: "cust_001", customerName: "Marcus Johnson", amount: 10.00, fee: 0.74, totalCharged: 10.74, status: "processed", luqraRefId: "LQ-2026-00003", createdAt: "2026-04-04T12:00:00" },
  { id: "txn_004", customerId: "cust_004", customerName: "Emily Rodriguez", amount: 50.00, fee: 1.94, totalCharged: 51.94, status: "deposited", luqraRefId: "LQ-2026-00004", createdAt: "2026-04-04T11:45:00" },
  { id: "txn_005", customerId: "cust_003", customerName: "David Chen", amount: 20.00, fee: 1.04, totalCharged: 21.04, status: "pending", luqraRefId: "LQ-2026-00005", createdAt: "2026-04-04T10:30:00" },
  { id: "txn_006", customerId: "cust_006", customerName: "Olivia Martinez", amount: 35.00, fee: 1.49, totalCharged: 36.49, status: "deposited", luqraRefId: "LQ-2026-00006", createdAt: "2026-04-03T18:20:00" },
  { id: "txn_007", customerId: "cust_007", customerName: "Daniel Kim", amount: 12.00, fee: 0.80, totalCharged: 12.80, status: "deposited", luqraRefId: "LQ-2026-00007", createdAt: "2026-04-03T16:00:00" },
  { id: "txn_008", customerId: "cust_002", customerName: "Sarah Williams", amount: 40.00, fee: 1.64, totalCharged: 41.64, status: "failed", luqraRefId: "LQ-2026-00008", createdAt: "2026-04-03T14:45:00" },
  { id: "txn_009", customerId: "cust_001", customerName: "Marcus Johnson", amount: 8.00, fee: 0.68, totalCharged: 8.68, status: "deposited", luqraRefId: "LQ-2026-00009", createdAt: "2026-04-03T12:30:00" },
  { id: "txn_010", customerId: "cust_004", customerName: "Emily Rodriguez", amount: 30.00, fee: 1.34, totalCharged: 31.34, status: "deposited", luqraRefId: "LQ-2026-00010", createdAt: "2026-04-03T10:15:00" },
  { id: "txn_011", customerId: "cust_006", customerName: "Olivia Martinez", amount: 18.00, fee: 0.98, totalCharged: 18.98, status: "deposited", luqraRefId: "LQ-2026-00011", createdAt: "2026-04-02T17:00:00" },
  { id: "txn_012", customerId: "cust_007", customerName: "Daniel Kim", amount: 22.00, fee: 1.10, totalCharged: 23.10, status: "processed", luqraRefId: "LQ-2026-00012", createdAt: "2026-04-02T15:30:00" },
  { id: "txn_013", customerId: "cust_001", customerName: "Marcus Johnson", amount: 5.00, fee: 0.59, totalCharged: 5.59, status: "deposited", luqraRefId: "LQ-2026-00013", createdAt: "2026-04-02T13:00:00" },
  { id: "txn_014", customerId: "cust_003", customerName: "David Chen", amount: 45.00, fee: 1.79, totalCharged: 46.79, status: "deposited", luqraRefId: "LQ-2026-00014", createdAt: "2026-04-02T11:45:00" },
  { id: "txn_015", customerId: "cust_002", customerName: "Sarah Williams", amount: 16.00, fee: 0.92, totalCharged: 16.92, status: "deposited", luqraRefId: "LQ-2026-00015", createdAt: "2026-04-01T19:00:00" },
  { id: "txn_016", customerId: "cust_004", customerName: "Emily Rodriguez", amount: 28.00, fee: 1.28, totalCharged: 29.28, status: "deposited", luqraRefId: "LQ-2026-00016", createdAt: "2026-04-01T16:30:00" },
  { id: "txn_017", customerId: "cust_008", customerName: "Sofia Patel", amount: 33.00, fee: 1.43, totalCharged: 34.43, status: "pending", luqraRefId: "LQ-2026-00017", createdAt: "2026-04-01T14:15:00" },
  { id: "txn_018", customerId: "cust_006", customerName: "Olivia Martinez", amount: 11.00, fee: 0.77, totalCharged: 11.77, status: "deposited", luqraRefId: "LQ-2026-00018", createdAt: "2026-04-01T12:00:00" },
  { id: "txn_019", customerId: "cust_007", customerName: "Daniel Kim", amount: 55.00, fee: 2.09, totalCharged: 57.09, status: "deposited", luqraRefId: "LQ-2026-00019", createdAt: "2026-03-31T18:30:00" },
  { id: "txn_020", customerId: "cust_001", customerName: "Marcus Johnson", amount: 19.00, fee: 1.01, totalCharged: 20.01, status: "deposited", luqraRefId: "LQ-2026-00020", createdAt: "2026-03-31T15:00:00" },
];

export const payouts: Payout[] = [
  { id: "pay_001", customerId: "cust_001", customerName: "Marcus Johnson", amount: 57.00, status: "completed", scheduledAt: "2026-04-04T00:00:00", completedAt: "2026-04-04T08:00:00" },
  { id: "pay_002", customerId: "cust_002", customerName: "Sarah Williams", amount: 41.00, status: "completed", scheduledAt: "2026-04-04T00:00:00", completedAt: "2026-04-04T08:15:00" },
  { id: "pay_003", customerId: "cust_004", customerName: "Emily Rodriguez", amount: 108.00, status: "completed", scheduledAt: "2026-04-04T00:00:00", completedAt: "2026-04-04T08:30:00" },
  { id: "pay_004", customerId: "cust_006", customerName: "Olivia Martinez", amount: 64.00, status: "scheduled", scheduledAt: "2026-04-05T00:00:00", completedAt: null },
  { id: "pay_005", customerId: "cust_007", customerName: "Daniel Kim", amount: 89.00, status: "scheduled", scheduledAt: "2026-04-05T00:00:00", completedAt: null },
  { id: "pay_006", customerId: "cust_003", customerName: "David Chen", amount: 65.00, status: "failed", scheduledAt: "2026-04-03T00:00:00", completedAt: null },
  { id: "pay_007", customerId: "cust_008", customerName: "Sofia Patel", amount: 33.00, status: "scheduled", scheduledAt: "2026-04-05T00:00:00", completedAt: null },
];

export const feeConfig: FeeConfig = {
  flatFee: 0.30,
  percentageFee: 3.9,
  updatedAt: "2026-03-01T10:00:00",
};

// --- Stats ---

export function getStats() {
  const totalTips = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalFees = transactions.reduce((sum, t) => sum + t.fee, 0);
  const totalTransactions = transactions.length;
  const activeCustomers = customers.filter((c) => c.active).length;
  const depositedAmount = transactions
    .filter((t) => t.status === "deposited")
    .reduce((sum, t) => sum + t.amount, 0);
  const pendingPayouts = payouts
    .filter((p) => p.status === "scheduled")
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    totalTips,
    totalFees,
    totalTransactions,
    activeCustomers,
    depositedAmount,
    pendingPayouts,
  };
}

export function getChartData() {
  return [
    { date: "Mar 25", tips: 120, fees: 8.4 },
    { date: "Mar 26", tips: 185, fees: 12.2 },
    { date: "Mar 27", tips: 210, fees: 14.1 },
    { date: "Mar 28", tips: 165, fees: 11.0 },
    { date: "Mar 29", tips: 290, fees: 19.5 },
    { date: "Mar 30", tips: 340, fees: 22.8 },
    { date: "Mar 31", tips: 245, fees: 16.4 },
    { date: "Apr 1", tips: 310, fees: 20.8 },
    { date: "Apr 2", tips: 275, fees: 18.4 },
    { date: "Apr 3", tips: 385, fees: 25.8 },
    { date: "Apr 4", tips: 420, fees: 28.2 },
    { date: "Apr 5", tips: 195, fees: 13.1 },
  ];
}
