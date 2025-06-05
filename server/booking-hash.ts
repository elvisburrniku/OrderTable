
import crypto from 'crypto';

const SECRET_KEY = process.env.BOOKING_HASH_SECRET || 'your-secret-key-change-in-production';

export class BookingHash {
  /**
   * Generate a secure hash for booking management actions
   * @param bookingId - The booking ID
   * @param tenantId - The tenant ID
   * @param restaurantId - The restaurant ID
   * @param action - The action type ('cancel' or 'change')
   * @returns A secure hash string
   */
  static generateHash(bookingId: number, tenantId: number, restaurantId: number, action: 'cancel' | 'change'): string {
    const data = `${bookingId}-${tenantId}-${restaurantId}-${action}`;
    return crypto.createHmac('sha256', SECRET_KEY).update(data).digest('hex');
  }

  /**
   * Verify a hash for booking management actions
   * @param hash - The hash to verify
   * @param bookingId - The booking ID
   * @param tenantId - The tenant ID
   * @param restaurantId - The restaurant ID
   * @param action - The action type ('cancel' or 'change')
   * @returns True if hash is valid, false otherwise
   */
  static verifyHash(hash: string, bookingId: number, tenantId: number, restaurantId: number, action: 'cancel' | 'change'): boolean {
    const expectedHash = this.generateHash(bookingId, tenantId, restaurantId, action);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
  }

  /**
   * Generate management URLs for booking confirmation emails
   * @param bookingId - The booking ID
   * @param tenantId - The tenant ID
   * @param restaurantId - The restaurant ID
   * @param baseUrl - The base URL of the application
   * @returns Object with cancel and change URLs
   */
  static generateManagementUrls(bookingId: number, tenantId: number, restaurantId: number, baseUrl: string = 'https://your-domain.com') {
    const cancelHash = this.generateHash(bookingId, tenantId, restaurantId, 'cancel');
    const changeHash = this.generateHash(bookingId, tenantId, restaurantId, 'change');

    return {
      cancelUrl: `${baseUrl}/booking-manage/${bookingId}?action=cancel&hash=${cancelHash}`,
      changeUrl: `${baseUrl}/booking-manage/${bookingId}?action=change&hash=${changeHash}`
    };
  }
}
