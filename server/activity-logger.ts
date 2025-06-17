import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

interface ActivityLoggerOptions {
  excludeRoutes?: string[];
  excludeMethods?: string[];
}

interface AuthenticatedRequest extends Request {
  user?: any;
  session?: any;
}

export class ActivityLogger {
  private options: ActivityLoggerOptions;

  constructor(options: ActivityLoggerOptions = {}) {
    this.options = {
      excludeRoutes: ['/api/auth/validate', '/api/heartbeat', '/api/health', ...(options.excludeRoutes || [])],
      excludeMethods: ['OPTIONS', ...(options.excludeMethods || [])]
    };
  }

  // Middleware function to log all activities
  middleware() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const originalSend = res.send;
      const startTime = Date.now();

      // Skip excluded routes and methods
      if (this.shouldSkip(req)) {
        return next();
      }

      // Capture response data
      res.send = function(data: any) {
        const responseTime = Date.now() - startTime;
        
        // Only log successful operations (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Don't await this to avoid blocking the response
          setImmediate(() => {
            ActivityLogger.logActivity(req, res, data, responseTime).catch(console.error);
          });
        }
        
        return originalSend.call(this, data);
      };

      next();
    };
  }

  private shouldSkip(req: AuthenticatedRequest): boolean {
    // Skip excluded routes
    if (this.options.excludeRoutes?.some(route => req.path.includes(route))) {
      return true;
    }

    // Skip excluded methods
    if (this.options.excludeMethods?.includes(req.method)) {
      return true;
    }

    // Skip static assets
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      return true;
    }

    return false;
  }

  private static async logActivity(
    req: AuthenticatedRequest, 
    res: Response, 
    responseData: any, 
    responseTime: number
  ) {
    try {
      const eventType = ActivityLogger.determineEventType(req, res);
      const description = ActivityLogger.generateDescription(req, res, eventType);
      
      // Extract tenant and restaurant info from URL or body
      const { tenantId, restaurantId } = ActivityLogger.extractTenantInfo(req);
      
      if (!tenantId) return; // Skip if no tenant context

      const userEmail = req.user?.email || req.session?.userEmail || null;
      const userLogin = req.user?.login || req.session?.userLogin || null;

      // Create activity log entry
      await storage.createActivityLog({
        restaurantId: restaurantId || 0,
        tenantId,
        eventType,
        description,
        source: 'manual',
        userEmail,
        userLogin,
        guestEmail: ActivityLogger.extractGuestEmail(req, responseData),
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        details: JSON.stringify({
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          responseTime,
          bodySize: req.body ? JSON.stringify(req.body).length : 0,
          userAgent: req.get('User-Agent'),
          referer: req.get('Referer') || null
        })
      });
    } catch (error) {
      console.error('Activity logging error:', error);
    }
  }

  private static determineEventType(req: AuthenticatedRequest, res: Response): string {
    const method = req.method.toLowerCase();
    const path = req.path.toLowerCase();

    // Authentication events
    if (path.includes('/login')) return 'login';
    if (path.includes('/logout')) return 'logout';
    if (path.includes('/register')) return 'registration';
    if (path.includes('/password')) return 'password_change';

    // Booking events
    if (path.includes('/booking')) {
      if (method === 'post') return 'booking_create';
      if (method === 'put' || method === 'patch') return 'booking_update';
      if (method === 'delete') return 'booking_cancel';
      return 'booking_view';
    }

    // Customer events
    if (path.includes('/customer')) {
      if (method === 'post') return 'customer_create';
      if (method === 'put' || method === 'patch') return 'customer_update';
      if (method === 'delete') return 'customer_delete';
      return 'customer_view';
    }

    // Table events
    if (path.includes('/table')) {
      if (method === 'post') return 'table_create';
      if (method === 'put' || method === 'patch') return 'table_update';
      if (method === 'delete') return 'table_delete';
      return 'table_view';
    }

    // Room events
    if (path.includes('/room')) {
      if (method === 'post') return 'room_create';
      if (method === 'put' || method === 'patch') return 'room_update';
      if (method === 'delete') return 'room_delete';
      return 'room_view';
    }

    // Feedback events
    if (path.includes('/feedback')) {
      if (method === 'post') return 'feedback_submit';
      if (method === 'delete') return 'feedback_delete';
      return 'feedback_view';
    }

    // Restaurant settings events
    if (path.includes('/restaurant') && !path.includes('/restaurants')) {
      if (method === 'put' || method === 'patch') return 'restaurant_update';
      return 'restaurant_view';
    }

    // Staff events
    if (path.includes('/staff') || path.includes('/user')) {
      if (method === 'post') return 'staff_create';
      if (method === 'put' || method === 'patch') return 'staff_update';
      if (method === 'delete') return 'staff_delete';
      return 'staff_view';
    }

    // Menu events
    if (path.includes('/menu')) {
      if (method === 'post') return 'menu_create';
      if (method === 'put' || method === 'patch') return 'menu_update';
      if (method === 'delete') return 'menu_delete';
      return 'menu_view';
    }

    // Settings events
    if (path.includes('/setting')) {
      if (method === 'put' || method === 'patch') return 'settings_update';
      return 'settings_view';
    }

    // Reports and analytics
    if (path.includes('/report') || path.includes('/analytic')) {
      return 'report_view';
    }

    // Integration events
    if (path.includes('/integration')) {
      if (method === 'post') return 'integration_connect';
      if (method === 'delete') return 'integration_disconnect';
      if (method === 'put' || method === 'patch') return 'integration_update';
      return 'integration_view';
    }

    // Subscription events
    if (path.includes('/subscription') || path.includes('/billing')) {
      if (method === 'post') return 'subscription_update';
      return 'billing_view';
    }

    // Default based on HTTP method
    switch (method) {
      case 'post': return 'create';
      case 'put':
      case 'patch': return 'update';
      case 'delete': return 'delete';
      default: return 'view';
    }
  }

  private static generateDescription(req: AuthenticatedRequest, res: Response, eventType: string): string {
    const path = req.path;
    const method = req.method;
    const userEmail = req.user?.email || req.session?.userEmail || 'Unknown user';

    switch (eventType) {
      case 'login':
        return `User ${userEmail} logged in successfully`;
      case 'logout':
        return `User ${userEmail} logged out`;
      case 'registration':
        return `New user registered: ${userEmail}`;
      case 'password_change':
        return `User ${userEmail} changed password`;
      case 'booking_create':
        return `User ${userEmail} created a new booking`;
      case 'booking_update':
        return `User ${userEmail} updated booking information`;
      case 'booking_cancel':
        return `User ${userEmail} cancelled a booking`;
      case 'customer_create':
        return `User ${userEmail} added a new customer`;
      case 'customer_update':
        return `User ${userEmail} updated customer information`;
      case 'customer_delete':
        return `User ${userEmail} deleted a customer`;
      case 'table_create':
        return `User ${userEmail} created a new table`;
      case 'table_update':
        return `User ${userEmail} updated table settings`;
      case 'table_delete':
        return `User ${userEmail} deleted a table`;
      case 'room_create':
        return `User ${userEmail} created a new room`;
      case 'room_update':
        return `User ${userEmail} updated room settings`;
      case 'room_delete':
        return `User ${userEmail} deleted a room`;
      case 'feedback_submit':
        return path.includes('/guest-feedback') 
          ? `Guest submitted feedback via QR code`
          : `User ${userEmail} submitted feedback`;
      case 'feedback_delete':
        return `User ${userEmail} deleted feedback response`;
      case 'restaurant_update':
        return `User ${userEmail} updated restaurant settings`;
      case 'staff_create':
        return `User ${userEmail} added new staff member`;
      case 'staff_update':
        return `User ${userEmail} updated staff information`;
      case 'staff_delete':
        return `User ${userEmail} removed staff member`;
      case 'menu_create':
        return `User ${userEmail} created menu item`;
      case 'menu_update':
        return `User ${userEmail} updated menu item`;
      case 'menu_delete':
        return `User ${userEmail} deleted menu item`;
      case 'settings_update':
        return `User ${userEmail} updated system settings`;
      case 'integration_connect':
        return `User ${userEmail} connected external integration`;
      case 'integration_disconnect':
        return `User ${userEmail} disconnected external integration`;
      case 'integration_update':
        return `User ${userEmail} updated integration settings`;
      case 'subscription_update':
        return `User ${userEmail} updated subscription plan`;
      default:
        return `User ${userEmail} performed ${method} operation on ${path}`;
    }
  }

  private static extractTenantInfo(req: AuthenticatedRequest): { tenantId: number | null, restaurantId: number | null } {
    // Extract from URL parameters
    const tenantId = req.params.tenantId ? parseInt(req.params.tenantId) : null;
    const restaurantId = req.params.restaurantId ? parseInt(req.params.restaurantId) : null;
    
    // Extract from request body
    const bodyTenantId = req.body?.tenantId ? parseInt(req.body.tenantId) : null;
    const bodyRestaurantId = req.body?.restaurantId ? parseInt(req.body.restaurantId) : null;
    
    // Extract from query parameters
    const queryTenantId = req.query.tenantId ? parseInt(req.query.tenantId as string) : null;
    const queryRestaurantId = req.query.restaurantId ? parseInt(req.query.restaurantId as string) : null;

    return {
      tenantId: tenantId || bodyTenantId || queryTenantId,
      restaurantId: restaurantId || bodyRestaurantId || queryRestaurantId
    };
  }

  private static extractGuestEmail(req: AuthenticatedRequest, responseData: any): string | null {
    // Check if it's a guest feedback submission
    if (req.path.includes('/guest-feedback') && req.body?.customerEmail) {
      return req.body.customerEmail;
    }
    
    // Check response data for guest email
    if (responseData && typeof responseData === 'object') {
      const parsed = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
      if (parsed.customerEmail || parsed.guestEmail) {
        return parsed.customerEmail || parsed.guestEmail;
      }
    }
    
    return null;
  }
}

// Create singleton instance
export const activityLogger = new ActivityLogger();