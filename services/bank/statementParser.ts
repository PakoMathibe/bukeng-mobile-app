// services/bank/statementParser.ts
import * as pdfParse from 'pdf-parse';
import * as Papa from 'papaparse';

export interface ParsedStatement {
  transactions: BankTransaction[];
  accountHolder: string;
  accountNumber: string;
  bankName: string;
  periodStart: Date;
  periodEnd: Date;
  openingBalance: number;
  closingBalance: number;
}

export interface BankTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  balance: number;
  reference?: string;
}

export interface ParseOptions {
  maxFileSizeMB?: number;
}

export class StatementParser {
  private static readonly DEFAULT_MAX_SIZE_MB = 10;

  static async parsePDF(file: File, options?: ParseOptions): Promise<ParsedStatement> {
    this.validateFile(file, options);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfData = await pdfParse(Buffer.from(arrayBuffer));
      
      // Extract text from PDF
      const text = pdfData.text;
      
      // Parse the text to extract transactions
      // This is bank-specific and would need custom parsers per bank
      const transactions = this.extractTransactionsFromText(text);
      
      // Extract account info from text
      const accountInfo = this.extractAccountInfo(text);
      
      return {
        transactions,
        accountHolder: accountInfo.accountHolder,
        accountNumber: accountInfo.accountNumber,
        bankName: accountInfo.bankName,
        periodStart: this.extractPeriodStart(text),
        periodEnd: this.extractPeriodEnd(text),
        openingBalance: this.extractOpeningBalance(text),
        closingBalance: this.extractClosingBalance(text),
      };
    } catch (error) {
      throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async parseCSV(file: File, options?: ParseOptions): Promise<ParsedStatement> {
    this.validateFile(file, options);
    
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const transactions = this.extractTransactionsFromCSV(results.data);
            resolve({
              transactions,
              accountHolder: this.extractAccountHolderFromCSV(results.data),
              accountNumber: this.extractAccountNumberFromCSV(results.data),
              bankName: this.extractBankNameFromCSV(results.data),
              periodStart: this.extractPeriodStartFromCSV(results.data),
              periodEnd: this.extractPeriodEndFromCSV(results.data),
              openingBalance: this.extractOpeningBalanceFromCSV(results.data),
              closingBalance: this.extractClosingBalanceFromCSV(results.data),
            });
          } catch (error) {
            reject(new Error(`Failed to parse CSV data: ${error instanceof Error ? error.message : 'Unknown error'}`));
          }
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        },
      });
    });
  }

  static async parse(file: File, options?: ParseOptions): Promise<ParsedStatement> {
    const fileType = file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type;

    if (fileType === 'pdf' || mimeType === 'application/pdf') {
      return this.parsePDF(file, options);
    } else if (fileType === 'csv' || mimeType === 'text/csv') {
      return this.parseCSV(file, options);
    } else {
      throw new Error(`Unsupported file format: ${fileType || mimeType}. Please upload PDF or CSV.`);
    }
  }

  private static validateFile(file: File, options?: ParseOptions): void {
    const maxSizeMB = options?.maxFileSizeMB ?? this.DEFAULT_MAX_SIZE_MB;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
      throw new Error(`File size exceeds ${maxSizeMB}MB limit. Please upload a smaller file.`);
    }
    
    if (file.size === 0) {
      throw new Error('File is empty. Please upload a valid file.');
    }
  }

  // ============ Bank-Specific Parsing Helpers ============
  // These would need to be implemented per bank (FNB, Standard Bank, Capitec, etc.)
  
  private static extractTransactionsFromText(text: string): BankTransaction[] {
    // This is a simplified example. Real implementation would:
    // 1. Detect bank from text patterns
    // 2. Use bank-specific regex patterns
    // 3. Handle different date formats
    // 4. Parse debit/credit signs
    
    const transactions: BankTransaction[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      // Example pattern for transaction lines
      const transactionMatch = this.matchTransactionPattern(line);
      if (transactionMatch) {
        transactions.push(transactionMatch);
      }
    }
    
    return transactions;
  }

  private static extractTransactionsFromCSV(data: any[]): BankTransaction[] {
    // CSV format varies by bank. This is a generic example.
    const transactions: BankTransaction[] = [];
    
    for (const row of data) {
      const transaction = this.mapCSVRowToTransaction(row);
      if (transaction) {
        transactions.push(transaction);
      }
    }
    
    return transactions;
  }

  private static matchTransactionPattern(line: string): BankTransaction | null {
    // Example pattern - would need bank-specific implementation
    const datePattern = /(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/;
    const amountPattern = /([+-]?R?\s?\d+[,.]?\d*)/;
    
    const dateMatch = line.match(datePattern);
    const amountMatch = line.match(amountPattern);
    
    if (!dateMatch || !amountMatch) return null;
    
    const amount = parseFloat(amountMatch[1].replace(/[^0-9.-]/g, ''));
    
    return {
      date: new Date(dateMatch[1]),
      description: line,
      amount: Math.abs(amount),
      type: amount < 0 ? 'debit' : 'credit',
      balance: 0, // Would need to track running balance
    };
  }

  private static mapCSVRowToTransaction(row: any): BankTransaction | null {
    // Generic CSV mapping - would need bank-specific column mapping
    const date = row.Date || row['Transaction Date'] || row.date;
    const description = row.Description || row['Transaction Description'] || row.description;
    const amount = row.Amount || row.amount || row.Debit || row.Credit;
    
    if (!date || !description || !amount) return null;
    
    const amountNum = parseFloat(amount.toString().replace(/[^0-9.-]/g, ''));
    
    return {
      date: new Date(date),
      description: description.toString(),
      amount: Math.abs(amountNum),
      type: amountNum < 0 || row.Debit ? 'debit' : 'credit',
      balance: 0,
    };
  }

  private static extractAccountInfo(text: string): { accountHolder: string; accountNumber: string; bankName: string } {
    // Bank-specific extraction
    return {
      accountHolder: 'Unknown',
      accountNumber: '****',
      bankName: 'Unknown',
    };
  }

  private static extractPeriodStart(text: string): Date {
    // Extract statement period start date
    return new Date();
  }

  private static extractPeriodEnd(text: string): Date {
    // Extract statement period end date
    return new Date();
  }

  private static extractOpeningBalance(text: string): number {
    // Extract opening balance
    return 0;
  }

  private static extractClosingBalance(text: string): number {
    // Extract closing balance
    return 0;
  }

  // CSV-specific extractors
  private static extractAccountHolderFromCSV(data: any[]): string {
    return 'Unknown';
  }

  private static extractAccountNumberFromCSV(data: any[]): string {
    return '****';
  }

  private static extractBankNameFromCSV(data: any[]): string {
    return 'Unknown';
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
}