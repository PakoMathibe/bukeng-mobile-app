// modules/PinVerification/verifyPin.ts
export class PinVerification {
  private static readonly PIN_LENGTH = 4;
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

  private static attempts: Map<string, { count: number; lockUntil: number }> =
    new Map();

  static async verifyPin(
    userId: string,
    enteredPin: string,
    storedPinHash: string
  ): Promise<{
    verified: boolean;
    attemptsRemaining?: number;
    lockoutEnd?: Date;
  }> {
    // Check lockout
    const userAttempts = this.attempts.get(userId);
    if (userAttempts && userAttempts.lockUntil > Date.now()) {
      return {
        verified: false,
        lockoutEnd: new Date(userAttempts.lockUntil),
      };
    }

    // Verify PIN (in production, use proper hashing)
    const isValid = await this.validatePin(enteredPin, storedPinHash);

    if (!isValid) {
      const newCount = (userAttempts?.count || 0) + 1;
      const remaining = this.MAX_ATTEMPTS - newCount;

      if (remaining === 0) {
        this.attempts.set(userId, {
          count: 0,
          lockUntil: Date.now() + this.LOCKOUT_DURATION,
        });

        return {
          verified: false,
          lockoutEnd: new Date(Date.now() + this.LOCKOUT_DURATION),
        };
      }

      this.attempts.set(userId, {
        count: newCount,
        lockUntil: 0,
      });

      return {
        verified: false,
        attemptsRemaining: remaining,
      };
    }

    // Reset attempts on successful verification
    this.attempts.delete(userId);

    return { verified: true };
  }

  static validatePinFormat(pin: string): { valid: boolean; error?: string } {
    if (!/^\d+$/.test(pin)) {
      return { valid: false, error: 'PIN must contain only numbers' };
    }

    if (pin.length !== this.PIN_LENGTH) {
      return { valid: false, error: `PIN must be ${this.PIN_LENGTH} digits` };
    }

    return { valid: true };
  }

  private static async validatePin(
    enteredPin: string,
    storedHash: string
  ): Promise<boolean> {
    // In production, use bcrypt or similar
    await new Promise((resolve) => setTimeout(resolve, 500));
    return enteredPin === storedHash; // Simplified for demo
  }
}
