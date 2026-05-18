// domains/affordability/bankParser.ts
import * as pdfParse from 'pdf-parse';
import * as Papa from 'papaparse';

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

export class BankStatementParser {
  /**
   * Parse a bank statement file (PDF or CSV)
   */
  static async parse(file: File): Promise<ParsedBankStatement> {
    const fileType = file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type;

    if (fileType === 'pdf' || mimeType === 'application/pdf') {
      return this.parsePDF(file);
    } else if (fileType === 'csv' || mimeType === 'text/csv') {
      return this.parseCSV(file);
    } else {
      throw new Error('Unsupported file format. Please upload PDF or CSV.');
    }
  }

  /**
   * Parse a PDF bank statement
   */
  private static async parsePDF(file: File): Promise<ParsedBankStatement> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfData = await pdfParse(Buffer.from(arrayBuffer));
      const text = pdfData.text;
      
      // Detect bank from text content
      const bankName = this.detectBank(text);
      
      // Extract transactions based on bank format
      const transactions = this.extractTransactionsFromText(text, bankName);
      
      // Extract account information
      const accountHolder = this.extractAccountHolder(text, bankName);
      const accountNumber = this.extractAccountNumber(text, bankName);
      
      // Extract period and balances
      const periodStart = this.extractPeriodStart(text, bankName);
      const periodEnd = this.extractPeriodEnd(text, bankName);
      const openingBalance = this.extractOpeningBalance(text, bankName);
      const closingBalance = this.extractClosingBalance(text, bankName);
      
      // Calculate summary
      const summary = this.calculateSummary(transactions);
      
      return {
        accountHolder,
        accountNumber,
        bankName,
        periodStart,
        periodEnd,
        openingBalance,
        closingBalance,
        transactions,
        summary,
      };
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error('Failed to parse PDF file. Please ensure it is a valid bank statement.');
    }
  }

  /**
   * Parse a CSV bank statement
   */
  private static async parseCSV(file: File): Promise<ParsedBankStatement> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const data = results.data as any[];
            const bankName = this.detectBankFromCSV(data);
            const transactions = this.extractTransactionsFromCSV(data, bankName);
            const summary = this.calculateSummary(transactions);
            
            resolve({
              accountHolder: this.extractAccountHolderFromCSV(data),
              accountNumber: this.extractAccountNumberFromCSV(data),
              bankName,
              periodStart: this.extractPeriodStartFromCSV(data),
              periodEnd: this.extractPeriodEndFromCSV(data),
              openingBalance: this.extractOpeningBalanceFromCSV(data),
              closingBalance: this.extractClosingBalanceFromCSV(data),
              transactions,
              summary,
            });
          } catch (error) {
            reject(new Error('Failed to parse CSV data'));
          }
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        },
      });
    });
  }

  /**
   * Detect bank from PDF text content
   */
  private static detectBank(text: string): string {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('fnb') || lowerText.includes('first national bank')) return 'FNB';
    if (lowerText.includes('std bank') || lowerText.includes('standard bank')) return 'Standard Bank';
    if (lowerText.includes('absa')) return 'ABSA';
    if (lowerText.includes('nedbank')) return 'Nedbank';
    if (lowerText.includes('capitec')) return 'Capitec';
    if (lowerText.includes('tmb') || lowerText.includes('t银行的')) return 'Tymebank';
    return 'Unknown';
  }

  /**
   * Detect bank from CSV data
   */
  private static detectBankFromCSV(data: any[]): string {
    // Check for bank-specific column names
    const firstRow = data[0] || {};
    const columns = Object.keys(firstRow).join(' ').toLowerCase();
    
    if (columns.includes('fnb') || columns.includes('first national')) return 'FNB';
    if (columns.includes('std') || columns.includes('standard')) return 'Standard Bank';
    if (columns.includes('absa')) return 'ABSA';
    if (columns.includes('nedbank')) return 'Nedbank';
    if (columns.includes('capitec')) return 'Capitec';
    
    return 'Unknown';
  }

  /**
   * Extract transactions from PDF text based on bank format
   */
  private static extractTransactionsFromText(text: string, bankName: string): BankTransaction[] {
    const transactions: BankTransaction[] = [];
    const lines = text.split('\n');
    let currentBalance = 0;
    
    // Date patterns
    const datePatterns = [
      /(\d{2}\/\d{2}\/\d{4})/,      // DD/MM/YYYY
      /(\d{4}-\d{2}-\d{2})/,         // YYYY-MM-DD
      /(\d{2}-\d{2}-\d{4})/,         // DD-MM-YYYY
    ];
    
    // Amount patterns (including R sign, negative signs, etc.)
    const amountPatterns = [
      /([+-]?R?\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
      /([+-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
    ];
    
    for (const line of lines) {
      // Skip empty lines
      if (!line.trim()) continue;
      
      // Find date
      let date: Date | null = null;
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          date = this.parseDate(match[1]);
          break;
        }
      }
      
      if (!date) continue;
      
      // Find amount
      let amount: number | null = null;
      let amountStr: string | null = null;
      for (const pattern of amountPatterns) {
        const match = line.match(pattern);
        if (match) {
          amountStr = match[1];
          amount = this.parseAmount(amountStr);
          break;
        }
      }
      
      if (amount === null) continue;
      
      // Determine type
      const type = amount < 0 ? 'debit' : 'credit';
      const absAmount = Math.abs(amount);
      
      // Extract description (remove date and amount)
      let description = line;
      if (date) description = description.replace(datePatterns.find(p => p.test(description))?.exec(description)?.[0] || '', '');
      if (amountStr) description = description.replace(amountStr, '');
      description = description.trim().replace(/\s+/g, ' ');
      
      // Update running balance
      currentBalance += amount;
      
      transactions.push({
        date,
        description: description || 'Unknown Transaction',
        amount: absAmount,
        type,
        balance: currentBalance,
        category: this.categorizeDescription(description),
      });
    }
    
    return transactions;
  }

  /**
   * Extract transactions from CSV data
   */
  private static extractTransactionsFromCSV(data: any[], bankName: string): BankTransaction[] {
    const transactions: BankTransaction[] = [];
    let currentBalance = 0;
    
    // Map CSV columns based on bank
    let dateCol = 'Date';
    let descCol = 'Description';
    let debitCol = 'Debit';
    let creditCol = 'Credit';
    let balanceCol = 'Balance';
    
    // Bank-specific column mapping
    const firstRow = data[0] || {};
    const columns = Object.keys(firstRow);
    
    if (bankName === 'FNB') {
      dateCol = columns.find(c => c.toLowerCase().includes('date')) || 'Date';
      descCol = columns.find(c => c.toLowerCase().includes('desc')) || 'Description';
      debitCol = columns.find(c => c.toLowerCase().includes('debit')) || 'Debit';
      creditCol = columns.find(c => c.toLowerCase().includes('credit')) || 'Credit';
      balanceCol = columns.find(c => c.toLowerCase().includes('balance')) || 'Balance';
    } else if (bankName === 'Capitec') {
      dateCol = columns.find(c => c.toLowerCase().includes('date')) || 'Date';
      descCol = columns.find(c => c.toLowerCase().includes('transaction')) || 'Description';
      debitCol = columns.find(c => c.toLowerCase().includes('withdrawal')) || 'Debit';
      creditCol = columns.find(c => c.toLowerCase().includes('deposit')) || 'Credit';
    }
    
    for (const row of data) {
      const dateStr = row[dateCol];
      if (!dateStr) continue;
      
      const date = this.parseDate(dateStr);
      const description = row[descCol] || 'Unknown Transaction';
      
      let amount = 0;
      let type: 'credit' | 'debit' = 'debit';
      
      if (row[debitCol] && parseFloat(row[debitCol]) > 0) {
        amount = parseFloat(row[debitCol]);
        type = 'debit';
      } else if (row[creditCol] && parseFloat(row[creditCol]) > 0) {
        amount = parseFloat(row[creditCol]);
        type = 'credit';
      }
      
      if (amount === 0) continue;
      
      const balance = row[balanceCol] ? parseFloat(row[balanceCol]) : currentBalance + (type === 'credit' ? amount : -amount);
      currentBalance = balance;
      
      transactions.push({
        date,
        description,
        amount,
        type,
        balance,
        category: this.categorizeDescription(description),
      });
    }
    
    return transactions;
  }

  /**
   * Parse date string to Date object
   */
  private static parseDate(dateStr: string): Date {
    // Try DD/MM/YYYY
    let match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
    }
    
    // Try YYYY-MM-DD
    match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    }
    
    // Try DD-MM-YYYY
    match = dateStr.match(/(\d{2})-(\d{2})-(\d{4})/);
    if (match) {
      return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
    }
    
    return new Date();
  }

  /**
   * Parse amount string to number
   */
  private static parseAmount(amountStr: string): number {
    // Remove R symbol and spaces
    let cleaned = amountStr.replace(/[R\s]/g, '');
    // Replace comma with nothing (thousand separator)
    cleaned = cleaned.replace(/,/g, '');
    // Parse as float
    let amount = parseFloat(cleaned);
    
    // Check if negative (parentheses or minus sign)
    if (amountStr.includes('(') || amountStr.includes('-')) {
      amount = -Math.abs(amount);
    }
    
    return isNaN(amount) ? 0 : amount;
  }

  /**
   * Categorize transaction description
   */
  private static categorizeDescription(description: string): string {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('spar') || lowerDesc.includes('checkers') || lowerDesc.includes('pick n pay') || lowerDesc.includes('woolworths')) {
      return 'Groceries';
    }
    if (lowerDesc.includes('uber') || lowerDesc.includes('bolt') || lowerDesc.includes('taxi')) {
      return 'Transport';
    }
    if (lowerDesc.includes('netflix') || lowerDesc.includes('showmax') || lowerDesc.includes('disney')) {
      return 'Entertainment';
    }
    if (lowerDesc.includes('electricity') || lowerDesc.includes('water') || lowerDesc.includes('wifi')) {
      return 'Utilities';
    }
    if (lowerDesc.includes('salary') || lowerDesc.includes('wage') || lowerDesc.includes('income')) {
      return 'Income';
    }
    
    return 'Other';
  }

  /**
   * Calculate summary statistics from transactions
   */
  private static calculateSummary(transactions: BankTransaction[]): ParsedBankStatement['summary'] {
    let totalCredits = 0;
    let totalDebits = 0;
    let salaryCredits = 0;
    let salaryCount = 0;
    let totalBalance = 0;
    
    for (const tx of transactions) {
      if (tx.type === 'credit') {
        totalCredits += tx.amount;
        if (tx.category === 'Income' || tx.description.toLowerCase().includes('salary')) {
          salaryCredits += tx.amount;
          salaryCount++;
        }
      } else {
        totalDebits += tx.amount;
      }
      totalBalance += tx.balance;
    }
    
    const averageBalance = transactions.length > 0 ? totalBalance / transactions.length : 0;
    
    return {
      totalCredits,
      totalDebits,
      averageBalance,
      transactionCount: transactions.length,
      salaryCredits,
      salaryCount,
    };
  }

  /**
   * Extract account holder name from text
   */
  private static extractAccountHolder(text: string, bankName: string): string {
    // Bank-specific extraction logic
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes('account holder') || line.toLowerCase().includes('customer name')) {
        return line.split(':').pop()?.trim() || 'Unknown';
      }
    }
    return 'Unknown';
  }

  /**
   * Extract account number from text
   */
  private static extractAccountNumber(text: string, bankName: string): string {
    const accountPattern = /(\d{4}[-\s]?\d{4}[-\s]?\d{4})/;
    const match = text.match(accountPattern);
    if (match) {
      return match[1].replace(/[-\s]/g, '').slice(-4);
    }
    return '****';
  }

  /**
   * Extract period start date
   */
  private static extractPeriodStart(text: string, bankName: string): Date {
    // Look for date range patterns
    const patterns = [
      /from\s+(\d{2}\/\d{2}\/\d{4})/i,
      /period\s*:\s*(\d{2}\/\d{2}\/\d{4})/i,
      /statement\s+from\s+(\d{2}\/\d{2}\/\d{4})/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return this.parseDate(match[1]);
      }
    }
    
    return new Date();
  }

  /**
   * Extract period end date
   */
  private static extractPeriodEnd(text: string, bankName: string): Date {
    const patterns = [
      /to\s+(\d{2}\/\d{2}\/\d{4})/i,
      /period\s*:\s*(?:\d{2}\/\d{2}\/\d{4})\s*[-to]+\s*(\d{2}\/\d{2}\/\d{4})/i,
      /statement\s+to\s+(\d{2}\/\d{2}\/\d{4})/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return this.parseDate(match[1]);
      }
    }
    
    return new Date();
  }

  /**
   * Extract opening balance
   */
  private static extractOpeningBalance(text: string, bankName: string): number {
    const patterns = [
      /opening\s+balance[:\s]+R?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
      /balance\s+brought\s+forward[:\s]+R?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return this.parseAmount(match[1]);
      }
    }
    
    return 0;
  }

  /**
   * Extract closing balance
   */
  private static extractClosingBalance(text: string, bankName: string): number {
    const patterns = [
      /closing\s+balance[:\s]+R?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
      /balance\s+carried\s+forward[:\s]+R?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return this.parseAmount(match[1]);
      }
    }
    
    return 0;
  }

  // CSV-specific extractors with default implementations
  private static extractAccountHolderFromCSV(data: any[]): string {
    return 'Unknown';
  }

  private static extractAccountNumberFromCSV(data: any[]): string {
    return '****';
  }

  private static extractPeriodStartFromCSV(data: any[]): Date {
    return new Date();
  }

  private static extractPeriodEndFromCSV(data: any[]): Date {
    return new Date();
  }

  private static extractOpeningBalanceFromCSV(data: any[]): number {
    return 0;
  }

  private static extractClosingBalanceFromCSV(data: any[]): number {
    return 0;
  }

  /**
   * Analyze parsed statement to generate credit insights
   */
  static async analyzeStatement(parsed: ParsedBankStatement): Promise<BankAnalysis> {
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
    const categoryMap = new Map<string, number>();
    for (const tx of parsed.transactions) {
      if (tx.type === 'debit' && tx.category) {
        const current = categoryMap.get(tx.category) || 0;
        categoryMap.set(tx.category, current + Math.abs(tx.amount));
      }
    }

    const totalSpend = Array.from(categoryMap.values()).reduce((a, b) => a + b, 0);
    const spendingPatterns = Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalSpend > 0 ? (amount / totalSpend) * 100 : 0,
    }));

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

    const suggestedCreditLimit = Math.min(Math.max(Math.floor(disposableIncome * 0.5), 500), 5000);

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
      spendingPatterns: spendingPatterns.sort((a, b) => b.percentage - a.percentage),
      topMerchants,
      flags,
    };
  }
}