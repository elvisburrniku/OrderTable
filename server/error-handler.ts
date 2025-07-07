import { Response } from 'express';
import { BrevoEmailService } from './brevo-service';
import { systemSettings } from './system-settings';

export enum ErrorType {
  SUBSCRIPTION_LIMIT = 'SUBSCRIPTION_LIMIT',
  TABLE_LIMIT = 'TABLE_LIMIT',
  PAYMENT_ERROR = 'PAYMENT_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

export interface ErrorDetails {
  type: ErrorType;
  message: string;
  userMessage: string;
  details?: any;
  statusCode?: number;
  shouldNotifyAdmin?: boolean;
}

class ErrorHandlerService {
  private emailService: BrevoEmailService | null = null;

  constructor() {
    this.initializeEmailService();
  }

  private async initializeEmailService() {
    try {
      this.emailService = new BrevoEmailService();
      console.log('Error handler: Email service initialized');
    } catch (error) {
      console.error('Error handler: Failed to initialize email service:', error);
    }
  }

  public handleError(res: Response, error: ErrorDetails): void {
    const statusCode = error.statusCode || 500;
    
    // Log the error
    console.error(`[${error.type}] ${error.message}`, error.details);

    // Send user-friendly error response
    res.status(statusCode).json({
      error: true,
      type: error.type,
      message: error.userMessage,
      timestamp: new Date().toISOString()
    });

    // Send admin notification for critical errors
    if (error.shouldNotifyAdmin) {
      this.notifyAdmin(error);
    }
  }

  private async notifyAdmin(error: ErrorDetails): Promise<void> {
    if (!this.emailService) {
      console.error('Cannot send admin notification: Email service not initialized');
      return;
    }

    try {
      const adminSettings = await systemSettings.get();
      const adminEmail = adminSettings?.adminNotificationEmail || process.env.ADMIN_EMAIL || 'admin@replit.com';

      const emailContent = `
        <h2>Critical System Error</h2>
        <p><strong>Error Type:</strong> ${error.type}</p>
        <p><strong>Message:</strong> ${error.message}</p>
        <p><strong>User Message:</strong> ${error.userMessage}</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        ${error.details ? `<p><strong>Details:</strong></p><pre>${JSON.stringify(error.details, null, 2)}</pre>` : ''}
        <hr>
        <p>This is an automated notification from your restaurant booking system.</p>
      `;

      await this.emailService.sendEmail({
        to: adminEmail,
        subject: `Critical System Error: ${error.type}`,
        html: emailContent
      });

      console.log(`Admin notification sent to ${adminEmail} for error type: ${error.type}`);
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError);
    }
  }

  // Predefined error generators for common scenarios
  public subscriptionLimitError(currentLimit: number, attempted: number, feature: string): ErrorDetails {
    return {
      type: ErrorType.SUBSCRIPTION_LIMIT,
      message: `Subscription limit exceeded: Attempted to use ${attempted} ${feature} but limit is ${currentLimit}`,
      userMessage: `Your current subscription plan allows up to ${currentLimit} ${feature}. You attempted to create ${attempted}. Please upgrade your subscription to add more ${feature}.`,
      statusCode: 403,
      shouldNotifyAdmin: false,
      details: { currentLimit, attempted, feature }
    };
  }

  public tableLimitError(currentTables: number, maxTables: number): ErrorDetails {
    return {
      type: ErrorType.TABLE_LIMIT,
      message: `Table limit exceeded: Restaurant has ${currentTables} tables, maximum is ${maxTables}`,
      userMessage: `You've reached the maximum number of tables (${maxTables}) for your current subscription. Please upgrade your plan to add more tables.`,
      statusCode: 403,
      shouldNotifyAdmin: false,
      details: { currentTables, maxTables }
    };
  }

  public paymentError(message: string, details?: any): ErrorDetails {
    return {
      type: ErrorType.PAYMENT_ERROR,
      message: `Payment processing error: ${message}`,
      userMessage: 'We encountered an issue processing your payment. Please check your payment information and try again. If the problem persists, contact support.',
      statusCode: 400,
      shouldNotifyAdmin: true,
      details
    };
  }

  public databaseError(operation: string, error: any): ErrorDetails {
    return {
      type: ErrorType.DATABASE_ERROR,
      message: `Database operation failed: ${operation}`,
      userMessage: 'We encountered a technical issue. Our team has been notified and is working to resolve it. Please try again in a few moments.',
      statusCode: 500,
      shouldNotifyAdmin: true,
      details: { operation, error: error.message || error }
    };
  }

  public validationError(field: string, issue: string): ErrorDetails {
    return {
      type: ErrorType.VALIDATION_ERROR,
      message: `Validation failed for ${field}: ${issue}`,
      userMessage: `Please check your input: ${issue}`,
      statusCode: 400,
      shouldNotifyAdmin: false,
      details: { field, issue }
    };
  }

  public authenticationError(reason?: string): ErrorDetails {
    return {
      type: ErrorType.AUTHENTICATION_ERROR,
      message: `Authentication failed: ${reason || 'Invalid credentials'}`,
      userMessage: reason || 'Invalid email or password. Please check your credentials and try again.',
      statusCode: 401,
      shouldNotifyAdmin: false
    };
  }

  public permissionError(action: string): ErrorDetails {
    return {
      type: ErrorType.PERMISSION_ERROR,
      message: `Permission denied for action: ${action}`,
      userMessage: `You don't have permission to ${action}. Please contact your administrator if you believe this is an error.`,
      statusCode: 403,
      shouldNotifyAdmin: false,
      details: { action }
    };
  }

  public externalServiceError(service: string, error: any): ErrorDetails {
    return {
      type: ErrorType.EXTERNAL_SERVICE_ERROR,
      message: `External service error: ${service} - ${error.message || error}`,
      userMessage: `We're having trouble connecting to ${service}. Please try again later or contact support if the issue persists.`,
      statusCode: 503,
      shouldNotifyAdmin: true,
      details: { service, error: error.message || error }
    };
  }

  public systemError(message: string, error?: any): ErrorDetails {
    return {
      type: ErrorType.SYSTEM_ERROR,
      message: `System error: ${message}`,
      userMessage: 'An unexpected error occurred. Our team has been notified and is working to fix it. Please try again later.',
      statusCode: 500,
      shouldNotifyAdmin: true,
      details: { originalError: error?.message || error }
    };
  }
}

export const errorHandler = new ErrorHandlerService();