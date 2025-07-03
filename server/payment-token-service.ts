import * as crypto from 'crypto';

const SECRET_KEY = process.env.PAYMENT_TOKEN_SECRET || 'your-payment-secret-key-change-in-production';
const ALGORITHM = 'aes-256-gcm';

export interface PaymentTokenData {
  bookingId: number;
  tenantId: number;
  restaurantId: number;
  amount: number;
  currency: string;
  expiresAt: number;
}

export class PaymentTokenService {
  /**
   * Generate a secure encrypted token for payment
   * @param data - Payment data to encrypt
   * @returns Encrypted token string
   */
  static generateToken(data: PaymentTokenData): string {
    try {
      const iv = crypto.randomBytes(16);
      const key = crypto.scryptSync(SECRET_KEY, 'salt', 32);
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      
      const tokenData = {
        ...data,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours expiry
      };
      
      let encrypted = cipher.update(JSON.stringify(tokenData), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV, auth tag, and encrypted data
      const token = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
      
      console.log(`Generated secure payment token for booking ${data.bookingId}`);
      return Buffer.from(token).toString('base64url');
    } catch (error) {
      console.error('Error generating payment token:', error);
      throw new Error('Failed to generate payment token');
    }
  }

  /**
   * Decrypt and verify payment token
   * @param token - Encrypted token string
   * @returns Decrypted payment data or null if invalid
   */
  static verifyToken(token: string): PaymentTokenData | null {
    try {
      const tokenString = Buffer.from(token, 'base64url').toString('utf8');
      const parts = tokenString.split(':');
      
      if (parts.length !== 3) {
        return null;
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const key = crypto.scryptSync(SECRET_KEY, 'salt', 32);
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      const data = JSON.parse(decrypted) as PaymentTokenData;
      
      // Check expiry
      if (Date.now() > data.expiresAt) {
        console.log(`Payment token expired for booking ${data.bookingId}`);
        return null;
      }
      
      console.log(`Payment token verified for booking ${data.bookingId}`);
      return data;
    } catch (error) {
      console.error('Error verifying payment token:', error);
      return null;
    }
  }

  /**
   * Generate secure payment URL with encrypted token
   * @param bookingId - The booking ID
   * @param tenantId - The tenant ID
   * @param restaurantId - The restaurant ID
   * @param amount - Payment amount
   * @param currency - Payment currency
   * @param baseUrl - The base URL of the application
   * @returns Secure payment URL with encrypted token
   */
  static generateSecurePaymentUrl(
    bookingId: number,
    tenantId: number,
    restaurantId: number,
    amount: number,
    currency: string = 'USD',
    baseUrl: string = 'https://your-domain.com'
  ): string {
    const tokenData: PaymentTokenData = {
      bookingId,
      tenantId,
      restaurantId,
      amount,
      currency,
      expiresAt: 0 // Will be set in generateToken
    };
    
    const token = this.generateToken(tokenData);
    return `${baseUrl}/prepayment?token=${token}`;
  }
}