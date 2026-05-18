// lib/client-crypto.ts
// This file is safe for browser/client use ONLY

/**
 * Generates a cryptographically secure random code
 * Uses Web Crypto API for production, falls back to Math.random for development
 */
export async function generateSecureRandomCode(length: number = 6): Promise<string> {
    const digits = '0123456789';
    let code = '';
    
    // Use Web Crypto API if available (secure)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const randomValues = new Uint8Array(length);
      crypto.getRandomValues(randomValues);
      
      for (let i = 0; i < length; i++) {
        code += digits[randomValues[i] % digits.length];
      }
      return code;
    }
    
    // Fallback for older browsers (less secure, but acceptable for demo)
    console.warn('Web Crypto API not available, using Math.random() fallback');
    for (let i = 0; i < length; i++) {
      code += Math.floor(Math.random() * 10);
    }
    return code;
  }
  
  /**
   * Hash a PIN using SHA-256 via Web Crypto API
   * This is cryptographically secure and not reversible
   */
  export async function hashPin(pin: string): Promise<string> {
    // Use Web Crypto API for secure hashing
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(pin);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    }
    
    // Fallback for older browsers (not secure, for demo only)
    console.warn('Web Crypto API not available, using simple hash fallback (not secure)');
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      hash = ((hash << 5) - hash) + pin.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString();
  }
  
  /**
   * Verify a PIN against its hash
   */
  export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
    const hashedPin = await hashPin(pin);
    return hashedPin === storedHash;
  }
  
  /**
   * Generate a random session ID
   */
  export function generateSessionId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Simple XOR encryption for client-side data (not for sensitive data)
   * WARNING: This is NOT secure for sensitive data. Use only for non-sensitive obfuscation.
   */
  export function simpleObfuscate(data: string, key: string): string {
    let result = '';
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return btoa(result);
  }
  
  /**
   * Decode simple XOR obfuscation
   */
  export function simpleDeobfuscate(obfuscated: string, key: string): string {
    try {
      const decoded = atob(obfuscated);
      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += String.fromCharCode(charCode);
      }
      return result;
    } catch {
      return '';
    }
  }