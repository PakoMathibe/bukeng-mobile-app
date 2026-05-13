// domains/onboarding/steps/bankStatementUpload.ts
export interface BankAnalysis {
  monthlyIncome: number;
  monthlyExpenses: number;
  disposableIncome: number;
  riskScore: number;
  suggestedCreditLimit: number;
  incomeStability: 'high' | 'medium' | 'low';
  spendingPatterns: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  topMerchants: Array<{
    name: string;
    amount: number;
    frequency: number;
  }>;
  flags: string[];
}

export class BankStatementUploadStep {
  static async upload(file: File): Promise<BankAnalysis> {
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Simulate parsing and analysis
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Return mock analysis
    return {
      monthlyIncome: 12500,
      monthlyExpenses: 8750,
      disposableIncome: 3750,
      riskScore: 72,
      suggestedCreditLimit: 1500,
      incomeStability: 'medium',
      spendingPatterns: [
        { category: 'Groceries', amount: 3200, percentage: 36.6 },
        { category: 'Transport', amount: 1800, percentage: 20.6 },
        { category: 'Utilities', amount: 1500, percentage: 17.1 },
        { category: 'Entertainment', amount: 1250, percentage: 14.3 },
        { category: 'Other', amount: 1000, percentage: 11.4 },
      ],
      topMerchants: [
        { name: 'SPAR', amount: 1800, frequency: 12 },
        { name: 'Checkers', amount: 1400, frequency: 8 },
        { name: 'Uber', amount: 600, frequency: 15 },
      ],
      flags: [],
    };
  }

  static validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File must be less than 10MB',
      };
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (
      !allowedTypes.includes(file.type) &&
      !['pdf', 'csv', 'xls', 'xlsx'].includes(extension || '')
    ) {
      return {
        valid: false,
        error: 'Please upload a PDF or CSV file',
      };
    }

    return { valid: true };
  }

  static async parsePDF(file: File): Promise<any> {
    // In production, use pdf-parse library
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return { transactions: [] };
  }

  static async parseCSV(file: File): Promise<any> {
    // In production, use PapaParse
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { transactions: [] };
  }
}
