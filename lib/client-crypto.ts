// lib/client-crypto.ts
// This file is safe for browser/client use ONLY

export function generateSecureRandomCode(length: number = 6): string {
    return Math.floor(100000 + Math.random() * 900000).toString().slice(0, length);
  }
  
  export function hashPin(pin: string): string {
    // Simple hash for demo - in production use proper crypto
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      hash = ((hash << 5) - hash) + pin.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString();
  }
  
  export function verifyPin(pin: string, storedHash: string): boolean {
    return hashPin(pin) === storedHash;
  }