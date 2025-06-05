import QRCode from 'qrcode';

export class QRCodeService {
  /**
   * Generate a QR code for a table that links to the restaurant's booking page
   * @param tableId - The table ID
   * @param tableNumber - The table number
   * @param restaurantId - The restaurant ID
   * @param tenantId - The tenant ID
   * @param baseUrl - The base URL of the application
   * @returns Promise<string> - Base64 data URL of the QR code
   */
  static async generateTableQRCode(
    tableId: number,
    tableNumber: string,
    restaurantId: number,
    tenantId: number,
    baseUrl: string = process.env.REPLIT_DOMAINS || 'localhost:5000'
  ): Promise<string> {
    try {
      // Create the booking URL for this specific table
      const bookingUrl = `https://${baseUrl}/book/${tenantId}/${restaurantId}?table=${tableId}`;
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(bookingUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      });

      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate a QR code for general restaurant booking (not table-specific)
   * @param restaurantId - The restaurant ID
   * @param tenantId - The tenant ID
   * @param baseUrl - The base URL of the application
   * @returns Promise<string> - Base64 data URL of the QR code
   */
  static async generateRestaurantQRCode(
    restaurantId: number,
    tenantId: number,
    baseUrl: string = process.env.REPLIT_DOMAINS || 'localhost:5000'
  ): Promise<string> {
    try {
      // Create the general booking URL for the restaurant
      const bookingUrl = `https://${baseUrl}/book/${tenantId}/${restaurantId}`;
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(bookingUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      });

      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating restaurant QR code:', error);
      throw new Error('Failed to generate restaurant QR code');
    }
  }
}