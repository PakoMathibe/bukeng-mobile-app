// domains/affordability/bankParser.ts
export interface BankTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  balance: number;
  reference?: string;
  category?: string;
}

export interface ParsedBankStatement {
  accountHolder: string;
  accountNumber: string;
  bankName: string;
  periodStart: Date;
  periodEnd: Date;
  openingBalance: number;
  closingBalance: number;
  transactions: BankTransaction[];
  summary: {
    totalCredits: number;
    totalDebits: number;
    averageBalance: number;
    transactionCount: number;
    salaryCredits: number;
    salaryCount: number;
  };
}

export class BankStatementParser {
  static async parse(file: File): Promise<ParsedBankStatement> {
    const fileType = file.name.split('.').pop()?.toLowerCase();

    if (fileType === 'pdf') {
      return this.parsePDF(file);
    } else if (fileType === 'csv') {
      return this.parseCSV(file);
    } else {
      throw new Error('Unsupported file format. Please upload PDF or CSV.');
    }
  }

  private static async parsePDF(file: File): Promise<ParsedBankStatement> {
    // In production, use pdf-parse library
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Return mock data
    return this.getMockStatement();
  }

  private static async parseCSV(file: File): Promise<ParsedBankStatement> {
    // In production, use PapaParse
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Return mock data
    return this.getMockStatement();
  }

  private static getMockStatement(): ParsedBankStatement {
    const transactions: BankTransaction[] = [];
    const startDate = new Date('2024-01-01');

    // Generate mock transactions
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      // Salary on the 25th
      if (i === 24) {
        transactions.push({
          date,
          description: 'SALARY DEPOSIT - EMPLOYER PTY LTD',
          amount: 12500,
          type: 'credit',
          balance: 12500 + (i > 0 ? transactions[i - 1]?.balance || 0 : 5000),
          category: 'Income',
        });
      }

      // Regular expenses
      transactions.push({
        date,
        description: 'SPAR SUPERMARKET',
        amount: -350,
        type: 'debit',
        balance: (transactions[i - 1]?.balance || 5000) - 350,
        category: 'Groceries',
      });

      if (i % 5 === 0) {
        transactions.push({
          date,
          description: 'UBER TRIP',
          amount: -85,
          type: 'debit',
          balance: (transactions[i - 1]?.balance || 5000) - 85,
          category: 'Transport',
        });
      }
    }

    return {
      accountHolder: 'John Doe',
      accountNumber: '****1234',
      bankName: 'FNB',
      periodStart: startDate,
      periodEnd: new Date('2024-01-31'),
      openingBalance: 5000,
      closingBalance: transactions[transactions.length - 1]?.balance || 4500,
      transactions,
      summary: {
        totalCredits: 12500,
        totalDebits: 8750,
        averageBalance: 5200,
        transactionCount: transactions.length,
        salaryCredits: 12500,
        salaryCount: 1,
      },
    };
  }

  static async analyzeStatement(
    parsed: ParsedBankStatement
  ): Promise<BankAnalysis> {
    const monthlyIncome = parsed.summary.salaryCredits;
    const monthlyExpenses = Math.abs(parsed.summary.totalDebits);
    const disposableIncome = monthlyIncome - monthlyExpenses;

    // Calculate risk score
    let riskScore = 50;
    if (disposableIncome > 5000) riskScore += 20;
    else if (disposableIncome > 3000) riskScore += 10;
    else if (disposableIncome < 1000) riskScore -= 20;

    if (parsed.summary.transactionCount > 50) riskScore += 10;

    // Determine income stability
    let incomeStability: 'high' | 'medium' | 'low' = 'medium';
    if (parsed.summary.salaryCount >= 3) incomeStability = 'high';
    else if (parsed.summary.salaryCount === 1) incomeStability = 'low';

    // Calculate spending patterns
    const categoryMap = new Map<string, number>();
    for (const tx of parsed.transactions) {
      if (tx.type === 'debit' && tx.category) {
        const current = categoryMap.get(tx.category) || 0;
        categoryMap.set(tx.category, current + Math.abs(tx.amount));
      }
    }

    const totalSpend = Array.from(categoryMap.values()).reduce(
      (a, b) => a + b,
      0
    );
    const spendingPatterns = Array.from(categoryMap.entries()).map(
      ([category, amount]) => ({
        category,
        amount,
        percentage: (amount / totalSpend) * 100,
      })
    );

    // Top merchants
    const merchantMap = new Map<string, { amount: number; count: number }>();
    for (const tx of parsed.transactions) {
      if (tx.type === 'debit') {
        const merchant = tx.description.split(' - ')[0] || tx.description;
        const current = merchantMap.get(merchant) || { amount: 0, count: 0 };
        merchantMap.set(merchant, {
          amount: current.amount + Math.abs(tx.amount),
          count: current.count + 1,
        });
      }
    }

    const topMerchants = Array.from(merchantMap.entries())
      .map(([name, { amount, count }]) => ({ name, amount, frequency: count }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const suggestedCreditLimit = Math.min(
      Math.max(Math.floor(disposableIncome * 0.5), 500),
      5000
    );

    return {
      monthlyIncome,
      monthlyExpenses,
      disposableIncome,
      riskScore,
      suggestedCreditLimit,
      incomeStability,
      spendingPatterns: spendingPatterns.sort(
        (a, b) => b.percentage - a.percentage
      ),
      topMerchants,
      flags: [],
    };
  }
}
