import QRCode from 'qrcode';

export class QRCodeService {
  /**
   * Generate a QR code for a table that links to the table feedback page
   */
  static async generateTableQRCode(
    tableId: number,
    tableNumber: string,
    restaurantId: number,
    tenantId: number,
    baseUrl: string = process.env.REPLIT_DOMAINS || 'localhost:5000'
  ): Promise<string> {
    try {
      // Use the correct URL format for the Replit environment
      const domain = baseUrl.includes('localhost') ? `http://${baseUrl}` : `https://${baseUrl}`;
      const feedbackUrl = `${domain}/feedback/${tenantId}/${restaurantId}?table=${tableId}`;
      const qrCodeDataUrl = await QRCode.toDataURL(feedbackUrl);
      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate a QR code for general restaurant booking
   */
  static async generateRestaurantQRCode(
    restaurantId: number,
    tenantId: number,
    baseUrl: string = process.env.REPLIT_DOMAINS || 'localhost:5000'
  ): Promise<string> {
    try {
      const bookingUrl = `https://${baseUrl}/book/${tenantId}/${restaurantId}`;
      const qrCodeDataUrl = await QRCode.toDataURL(bookingUrl);
      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating restaurant QR code:', error);
      throw new Error('Failed to generate restaurant QR code');
    }
  }
}