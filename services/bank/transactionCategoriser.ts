// services/bank/transactionCategoriser.ts
export interface CategorizedTransaction {
  transaction: BankTransaction;
  category: string;
  subcategory?: string;
  confidence: number;
}

export interface CategorySummary {
  category: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
}

export class TransactionCategoriser {
  private static categories: Map<string, string[]> = new Map([
    ['Groceries', ['spar', 'checkers', 'pick n pay', 'woolworths', 'food']],
    ['Transport', ['uber', 'bolt', 'taxi', 'petrol', 'fuel']],
    ['Utilities', ['electricity', 'water', 'wifi', 'internet']],
    ['Entertainment', ['netflix', 'showmax', 'cinema', 'restaurant']],
    ['Shopping', ['clothing', 'electronics', 'amazon', 'takealot']],
  ]);

  static categorise(transaction: BankTransaction): CategorizedTransaction {
    const description = transaction.description.toLowerCase();

    for (const [category, keywords] of this.categories) {
      for (const keyword of keywords) {
        if (description.includes(keyword)) {
          return {
            transaction,
            category,
            confidence: 0.9,
          };
        }
      }
    }

    return {
      transaction,
      category: 'Other',
      confidence: 0.5,
    };
  }

  static summarise(transactions: BankTransaction[]): CategorySummary[] {
    const categoryMap = new Map<string, { amount: number; count: number }>();
    let totalAmount = 0;

    for (const transaction of transactions) {
      const categorised = this.categorise(transaction);
      totalAmount += Math.abs(transaction.amount);

      const existing = categoryMap.get(categorised.category) || {
        amount: 0,
        count: 0,
      };
      categoryMap.set(categorised.category, {
        amount: existing.amount + Math.abs(transaction.amount),
        count: existing.count + 1,
      });
    }

    const summaries: CategorySummary[] = [];
    for (const [category, data] of categoryMap) {
      summaries.push({
        category,
        totalAmount: data.amount,
        transactionCount: data.count,
        percentage: (data.amount / totalAmount) * 100,
      });
    }

    return summaries.sort((a, b) => b.totalAmount - a.totalAmount);
  }
}
