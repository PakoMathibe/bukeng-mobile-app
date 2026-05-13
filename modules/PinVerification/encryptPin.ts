// modules/PinVerification/encryptPin.ts
import crypto from 'crypto';

export class PinEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12;

  static async encrypt(
    pin: string,
    key: Buffer
  ): Promise<{ encrypted: string; iv: string; authTag: string }> {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

    let encrypted = cipher.update(pin, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  static async decrypt(
    encrypted: string,
    iv: string,
    authTag: string,
    key: Buffer
  ): Promise<string> {
    const decipher = crypto.createDecipheriv(
      this.ALGORITHM,
      key,
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  static hashPin(pin: string): string {
    // Simple hash for demo - use bcrypt in production
    const hash = crypto.createHash('sha256');
    hash.update(pin);
    return hash.digest('hex');
  }
}
