// modules/AccessControl/featureFlags.ts
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  minTier: number;
  percentage?: number;
  description?: string;
}

export class FeatureFlagManager {
  private static flags: Map<string, FeatureFlag> = new Map();

  static registerFlag(name: string, flag: FeatureFlag): void {
    this.flags.set(name, flag);
  }

  static isEnabled(name: string, userTier: number = 0): boolean {
    const flag = this.flags.get(name);

    if (!flag) return false;
    if (!flag.enabled) return false;
    if (userTier < flag.minTier) return false;

    if (flag.percentage) {
      // Deterministic rollout based on user ID would go here
      return true;
    }

    return true;
  }

  static getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  static initializeDefaultFlags(): void {
    this.registerFlag('qr_payments', {
      name: 'qr_payments',
      enabled: true,
      minTier: 1,
      description: 'Enable QR code payments',
    });

    this.registerFlag('bank_upload', {
      name: 'bank_upload',
      enabled: true,
      minTier: 1,
      description: 'Bank statement upload for higher limits',
    });

    this.registerFlag('cashback', {
      name: 'cashback',
      enabled: false,
      minTier: 3,
      percentage: 10,
      description: 'Cashback rewards program',
    });

    this.registerFlag('premium_support', {
      name: 'premium_support',
      enabled: true,
      minTier: 3,
      description: '24/7 premium customer support',
    });
  }
}
