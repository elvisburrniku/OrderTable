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
      const cipher = crypto.createCipherGCM(ALGORITHM, Buffer.from(SECRET_KEY, 'utf8').slice(0, 32));
      cipher.setAAD(Buffer.from('payment-token'));
      
      const tokenData = {
        ...data,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours expiry
      };
      
      const encrypted = Buffer.concat([
        cipher.update(JSON.stringify(tokenData), 'utf8'),
        cipher.final()
      ]);
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV, auth tag, and encrypted data
      const token = Buffer.concat([iv, authTag, encrypted]).toString('base64url');
      
      console.log(`Generated secure payment token for booking ${data.bookingId}`);
      return token;
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
      const tokenBuffer = Buffer.from(token, 'base64url');
      
      if (tokenBuffer.length < 32) {
        return null;
      }
      
      const iv = tokenBuffer.slice(0, 16);
      const authTag = tokenBuffer.slice(16, 32);
      const encrypted = tokenBuffer.slice(32);
      
      const decipher = crypto.createDecipherGCM(ALGORITHM, Buffer.from(SECRET_KEY, 'utf8').slice(0, 32));
      decipher.setAuthTag(authTag);
      decipher.setAAD(Buffer.from('payment-token'));
      
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      const data = JSON.parse(decrypted.toString('utf8')) as PaymentTokenData;
      
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