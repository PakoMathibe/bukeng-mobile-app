// modules/PinVerification/deviceBinding.ts
export interface DeviceBinding {
  deviceId: string;
  userId: string;
  fingerprint: string;
  boundAt: Date;
  lastUsedAt: Date;
  isActive: boolean;
}

export class DeviceBindingManager {
  private static readonly BINDING_KEY = 'bukeng_device_binding';

  static async bindDevice(
    userId: string,
    fingerprint: string
  ): Promise<DeviceBinding> {
    const binding: DeviceBinding = {
      deviceId: this.generateDeviceId(),
      userId,
      fingerprint,
      boundAt: new Date(),
      lastUsedAt: new Date(),
      isActive: true,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(this.BINDING_KEY, JSON.stringify(binding));
    }

    return binding;
  }

  static async verifyBinding(
    userId: string,
    fingerprint: string
  ): Promise<boolean> {
    if (typeof window === 'undefined') return true;

    const stored = localStorage.getItem(this.BINDING_KEY);
    if (!stored) return false;

    const binding: DeviceBinding = JSON.parse(stored);

    return (
      binding.userId === userId &&
      binding.fingerprint === fingerprint &&
      binding.isActive
    );
  }

  static async getBoundDevice(): Promise<DeviceBinding | null> {
    if (typeof window === 'undefined') return null;

    const stored = localStorage.getItem(this.BINDING_KEY);
    if (!stored) return null;

    return JSON.parse(stored);
  }

  static async unbindDevice(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.BINDING_KEY);
    }
  }

  static async updateLastUsed(): Promise<void> {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem(this.BINDING_KEY);
    if (stored) {
      const binding: DeviceBinding = JSON.parse(stored);
      binding.lastUsedAt = new Date();
      localStorage.setItem(this.BINDING_KEY, JSON.stringify(binding));
    }
  }

  private static generateDeviceId(): string {
    const components = [
      navigator.userAgent,
      screen.width,
      screen.height,
      navigator.language,
    ];
    const hash = this.hashString(components.join('|'));
    return `device_${hash}`;
  }

  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  static async isTrustedDevice(): Promise<boolean> {
    if (typeof window === 'undefined') return true;

    const binding = await this.getBoundDevice();
    if (!binding) return false;

    const daysSinceBind =
      (Date.now() - new Date(binding.boundAt).getTime()) /
      (1000 * 60 * 60 * 24);

    // Device is trusted if bound less than 90 days ago and active
    return binding.isActive && daysSinceBind < 90;
  }
}
