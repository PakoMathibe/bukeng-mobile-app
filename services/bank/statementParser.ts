// services/bank/statementParser.ts
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

export class StatementParser {
  static async parsePDF(file: File): Promise<ParsedStatement> {
    // In production, use pdf-parse or similar
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
      transactions: [],
      accountHolder: 'John Doe',
      accountNumber: '****1234',
      bankName: 'FNB',
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-01-31'),
      openingBalance: 5000,
      closingBalance: 4500,
    };
  }

  static async parseCSV(file: File): Promise<ParsedStatement> {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
      transactions: [],
      accountHolder: 'John Doe',
      accountNumber: '****1234',
      bankName: 'FNB',
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-01-31'),
      openingBalance: 5000,
      closingBalance: 4500,
    };
  }

  static async parse(file: File): Promise<ParsedStatement> {
    const fileType = file.name.split('.').pop()?.toLowerCase();

    if (fileType === 'pdf') {
      return this.parsePDF(file);
    } else if (fileType === 'csv') {
      return this.parseCSV(file);
    } else {
      throw new Error('Unsupported file format');
    }
  }
}
