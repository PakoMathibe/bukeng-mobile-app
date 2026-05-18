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

// Extended categories with subcategories and weighted keywords
interface CategoryRule {
  name: string;
  subcategories: SubcategoryRule[];
}

interface SubcategoryRule {
  name: string;
  keywords: string[];
  weight?: number;  // For confidence scoring
}

export class TransactionCategoriser {
  private static readonly MIN_CONFIDENCE = 0.3;
  private static readonly MAX_CONFIDENCE = 1.0;
  private static readonly DEFAULT_CONFIDENCE = 0.5;

  private static categories: Map<string, CategoryRule> = new Map([
    ['Groceries', {
      name: 'Groceries',
      subcategories: [
        { name: 'Supermarkets', keywords: ['spar', 'checkers', 'pick n pay', 'woolworths', 'shoprite', 'food lovers', 'aldi'] },
        { name: 'Butcheries', keywords: ['butcher', 'meat', 'chicken'] },
        { name: 'Bakeries', keywords: ['bakery', 'bread', 'pastry'] },
      ],
    }],
    ['Transport', {
      name: 'Transport',
      subcategories: [
        { name: 'Ride Hailing', keywords: ['uber', 'bolt', 'indrive', 'lyft'] },
        { name: 'Fuel', keywords: ['petrol', 'fuel', 'gas', 'bp', 'shell', 'engen', 'caltex', 'sasol'] },
        { name: 'Public Transport', keywords: ['taxi', 'bus', 'train', 'gautrain', 'metrorail', 'reya vaya'] },
        { name: 'Tolls', keywords: ['toll', 'sanral', 'etoll'] },
      ],
    }],
    ['Utilities', {
      name: 'Utilities',
      subcategories: [
        { name: 'Electricity', keywords: ['electricity', 'eskom', 'city power', 'prepaid', 'power'] },
        { name: 'Water', keywords: ['water', 'rand water', 'sanitation'] },
        { name: 'Internet', keywords: ['wifi', 'internet', 'fibre', 'vumatel', 'openserve', 'webafrica', 'cool ideas'] },
        { name: 'Mobile', keywords: ['vodacom', 'mtn', 'cell c', 'telkom', 'mobile', 'data', 'airtime'] },
      ],
    }],
    ['Entertainment', {
      name: 'Entertainment',
      subcategories: [
        { name: 'Streaming', keywords: ['netflix', 'showmax', 'disney', 'prime video', 'apple tv', 'youtube premium', 'spotify'] },
        { name: 'Dining', keywords: ['restaurant', 'cafe', 'dining', 'food', 'kfc', 'mcdonalds', 'burger king', 'nandos', 'steers'] },
        { name: 'Movies', keywords: ['cinema', 'movie', 'ster kinekor', 'nu metro', 'bioscope'] },
        { name: 'Gaming', keywords: ['playstation', 'xbox', 'nintendo', 'steam', 'epic games', 'roblox'] },
      ],
    }],
    ['Shopping', {
      name: 'Shopping',
      subcategories: [
        { name: 'Clothing', keywords: ['clothing', 'fashion', 'shoes', 'h&m', 'zara', 'cotton on', 'foschini', 'truworths', 'edgars'] },
        { name: 'Electronics', keywords: ['electronics', 'laptop', 'phone', 'tv', 'computer', 'incredible connection', 'dion wired', 'game'] },
        { name: 'Online Retail', keywords: ['amazon', 'takealot', 'bidorbuy', 'superbalist', 'zando', 'shein', 'temu'] },
        { name: 'Home', keywords: ['home', 'furniture', 'decor', 'coricraft', '@home', 'mr price home'] },
      ],
    }],
    ['Health', {
      name: 'Health',
      subcategories: [
        { name: 'Pharmacy', keywords: ['pharmacy', 'dischem', 'clicks', 'medicines', 'prescription'] },
        { name: 'Medical', keywords: ['doctor', 'hospital', 'clinic', 'dentist', 'specialist', 'medical aid', 'discovery', 'momentum'] },
        { name: 'Fitness', keywords: ['gym', 'fitness', 'virgin active', 'planet fitness', 'yoga'] },
      ],
    }],
    ['Education', {
      name: 'Education',
      subcategories: [
        { name: 'Tuition', keywords: ['school', 'university', 'college', 'tuition', 'fees', 'varsity', 'wits', 'uct', 'stellies'] },
        { name: 'Books', keywords: ['books', 'textbook', 'stationery', 'course materials'] },
        { name: 'Online Learning', keywords: ['coursera', 'udemy', 'skillshare', 'online course'] },
      ],
    }],
  ]);

  static categorise(transaction: BankTransaction): CategorizedTransaction {
    const description = transaction.description.toLowerCase();
    let bestMatch: { category: string; subcategory: string; confidence: number } | null = null;

    for (const [categoryName, categoryRule] of this.categories) {
      for (const subcategory of categoryRule.subcategories) {
        for (const keyword of subcategory.keywords) {
          if (description.includes(keyword)) {
            const keywordRelevance = keyword.length / description.length;
            const confidence = Math.min(
              this.MAX_CONFIDENCE,
              this.MIN_CONFIDENCE + (keywordRelevance * 0.5) + (subcategory.weight || 0)
            );
            
            if (!bestMatch || confidence > bestMatch.confidence) {
              bestMatch = {
                category: categoryName,
                subcategory: subcategory.name,
                confidence: Math.round(confidence * 100) / 100,
              };
            }
          }
        }
      }
    }

    if (bestMatch) {
      return {
        transaction,
        category: bestMatch.category,
        subcategory: bestMatch.subcategory,
        confidence: bestMatch.confidence,
      };
    }

    return {
      transaction,
      category: 'Other',
      confidence: this.DEFAULT_CONFIDENCE,
    };
  }

  static summarise(transactions: BankTransaction[]): CategorySummary[] {
    const categoryMap = new Map<string, { amount: number; count: number }>();
    let totalAmount = 0;

    for (const transaction of transactions) {
      const categorised = this.categorise(transaction);
      totalAmount += Math.abs(transaction.amount);

      const existing = categoryMap.get(categorised.category) || { amount: 0, count: 0 };
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
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      });
    }

    return summaries.sort((a, b) => b.totalAmount - a.totalAmount);
  }

  // Helper method to get category breakdown with subcategories
  static getDetailedBreakdown(transactions: BankTransaction[]): {
    byCategory: CategorySummary[];
    bySubcategory: Record<string, CategorySummary[]>;
  } {
    const subcategoryMap = new Map<string, Map<string, { amount: number; count: number }>>();
    let totalAmount = 0;

    for (const transaction of transactions) {
      const categorised = this.categorise(transaction);
      totalAmount += Math.abs(transaction.amount);

      if (!subcategoryMap.has(categorised.category)) {
        subcategoryMap.set(categorised.category, new Map());
      }
      
      const categoryMap = subcategoryMap.get(categorised.category)!;
      const subcatKey = categorised.subcategory || 'Uncategorized';
      const existing = categoryMap.get(subcatKey) || { amount: 0, count: 0 };
      categoryMap.set(subcatKey, {
        amount: existing.amount + Math.abs(transaction.amount),
        count: existing.count + 1,
      });
    }

    const byCategory = this.summarise(transactions);
    const bySubcategory: Record<string, CategorySummary[]> = {};

    for (const [category, subcats] of subcategoryMap) {
      bySubcategory[category] = [];
      for (const [subcategory, data] of subcats) {
        bySubcategory[category].push({
          category: subcategory,
          totalAmount: data.amount,
          transactionCount: data.count,
          percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
        });
      }
      bySubcategory[category].sort((a, b) => b.totalAmount - a.totalAmount);
    }

    return { byCategory, bySubcategory };
  }

  // Add custom category rules dynamically
  static addCategoryRule(category: string, subcategory: string, keywords: string[]): void {
    if (!this.categories.has(category)) {
      this.categories.set(category, {
        name: category,
        subcategories: [],
      });
    }
    
    this.categories.get(category)!.subcategories.push({
      name: subcategory,
      keywords,
    });
  }
}