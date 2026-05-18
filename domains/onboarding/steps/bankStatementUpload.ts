// domains/onboarding/steps/bankStatementUpload.ts
import { BankStatementParser, ParsedBankStatement } from '@/domains/affordability/bankParser';
import { TransactionCategoriser } from '@/services/bank/transactionCategoriser';

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
  /**
   * Upload and analyze a bank statement file
   */
  static async upload(file: File): Promise<BankAnalysis> {
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    try {
      // Parse the bank statement using BankStatementParser
      const parsedStatement = await BankStatementParser.parse(file);
      
      // Analyze the parsed statement
      const analysis = await this.analyzeStatement(parsedStatement);
      
      return analysis;
    } catch (error) {
      console.error('Bank statement upload failed:', error);
      throw new Error('Failed to process bank statement. Please ensure the file format is correct.');
    }
  }

  /**
   * Analyze parsed bank statement
   */
  private static async analyzeStatement(
    parsed: ParsedBankStatement
  ): Promise<BankAnalysis> {
    const monthlyIncome = parsed.summary.salaryCredits;
    const monthlyExpenses = Math.abs(parsed.summary.totalDebits);
    const disposableIncome = monthlyIncome - monthlyExpenses;

    // Calculate risk score (0-100, higher = lower risk)
    let riskScore = 50;
    if (disposableIncome > 5000) riskScore += 20;
    else if (disposableIncome > 3000) riskScore += 10;
    else if (disposableIncome < 1000) riskScore -= 20;
    else if (disposableIncome < 0) riskScore -= 40;

    if (parsed.summary.transactionCount > 50) riskScore += 10;
    if (parsed.summary.transactionCount < 10) riskScore -= 10;

    // Determine income stability
    let incomeStability: 'high' | 'medium' | 'low' = 'medium';
    if (parsed.summary.salaryCount >= 3) incomeStability = 'high';
    else if (parsed.summary.salaryCount === 1) incomeStability = 'low';
    else if (parsed.summary.salaryCount === 0) incomeStability = 'low';

    // Calculate spending patterns
    const summaries = TransactionCategoriser.summarise(parsed.transactions);
    const spendingPatterns = summaries.map(s => ({
      category: s.category,
      amount: s.totalAmount,
      percentage: s.percentage,
    }));

    // Calculate top merchants
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

    // Calculate suggested credit limit
    let suggestedCreditLimit = Math.min(
      Math.max(Math.floor(disposableIncome * 0.5), 500),
      5000
    );
    
    if (suggestedCreditLimit < 500 && monthlyIncome > 5000) {
      suggestedCreditLimit = 500;
    }

    // Generate flags
    const flags: string[] = [];
    if (disposableIncome < 2000) flags.push('LOW_DISPOSABLE_INCOME');
    if (monthlyExpenses > monthlyIncome * 0.8) flags.push('HIGH_EXPENSE_RATIO');
    if (parsed.summary.salaryCount === 0) flags.push('NO_REGULAR_INCOME');
    if (riskScore < 40) flags.push('HIGH_RISK_SCORE');

    return {
      monthlyIncome,
      monthlyExpenses,
      disposableIncome,
      riskScore: Math.min(Math.max(riskScore, 0), 100),
      suggestedCreditLimit,
      incomeStability,
      spendingPatterns,
      topMerchants,
      flags,
    };
  }

  /**
   * Validate file before processing
   */
  static validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!file || file.size === 0) {
      return { valid: false, error: 'No file provided' };
    }

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
        error: 'Please upload a PDF, CSV, or Excel file',
      };
    }

    return { valid: true };
  }
}