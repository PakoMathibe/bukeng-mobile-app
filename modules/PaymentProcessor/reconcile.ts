// modules/PaymentProcessor/reconcile.ts
export interface TransactionRecord {
  id: string;
  orderId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  gatewayReference: string;
  timestamp: Date;
}

export interface ReconciliationResult {
  matched: TransactionRecord[];
  unmatched: TransactionRecord[];
  discrepancies: {
    transactionId: string;
    expectedAmount: number;
    actualAmount: number;
  }[];
}

export class ReconciliationEngine {
  static async reconcile(
    transactions: TransactionRecord[],
    gatewayRecords: TransactionRecord[]
  ): Promise<ReconciliationResult> {
    const matched: TransactionRecord[] = [];
    const unmatched: TransactionRecord[] = [];
    const discrepancies: {
      transactionId: string;
      expectedAmount: number;
      actualAmount: number;
    }[] = [];

    for (const tx of transactions) {
      const match = gatewayRecords.find(
        (g) => g.gatewayReference === tx.gatewayReference
      );

      if (!match) {
        unmatched.push(tx);
        continue;
      }

      if (Math.abs(match.amount - tx.amount) > 0.01) {
        discrepancies.push({
          transactionId: tx.id,
          expectedAmount: tx.amount,
          actualAmount: match.amount,
        });
      } else {
        matched.push(tx);
      }
    }

    return { matched, unmatched, discrepancies };
  }

  static generateReport(result: ReconciliationResult): string {
    let report = 'Reconciliation Report\n';
    report += '====================\n\n';
    report += `Matched Transactions: ${result.matched.length}\n`;
    report += `Unmatched Transactions: ${result.unmatched.length}\n`;
    report += `Discrepancies: ${result.discrepancies.length}\n\n`;

    if (result.discrepancies.length > 0) {
      report += 'Discrepancies:\n';
      result.discrepancies.forEach((d) => {
        report += `  - ${d.transactionId}: Expected R${d.expectedAmount}, Got R${d.actualAmount}\n`;
      });
    }

    return report;
  }
}
