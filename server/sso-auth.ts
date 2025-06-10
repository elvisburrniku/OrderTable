import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { generateSlug } from "./utils/slug-generator.js";

// SSO Configuration
const SSO_CONFIG = {
  google: {
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: "/api/auth/google/callback"
  },
  github: {
    clientID: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    callbackURL: "/api/auth/github/callback"
  }
};

interface SSOProfile {
  id: string;
  emails: Array<{ value: string; verified?: boolean }>;
  displayName: string;
  photos?: Array<{ value: string }>;
  provider: string;
}

export function setupSSO(app: Express) {
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Serialize/deserialize user for session management
  passport.serializeUser((user: any, done) => {
    done(null, { id: user.id, provider: user.provider });
  });

  passport.deserializeUser(async (sessionUser: any, done) => {
    try {
      const user = await storage.getUserById(sessionUser.id);
      if (user) {
        const tenant = await storage.getTenantByUserId(user.id);
        const restaurant = await storage.getRestaurantByUserId(user.id);
        done(null, { user, tenant, restaurant });
      } else {
        done(null, false);
      }
    } catch (error) {
      done(error, null);
    }
  });

  // Google OAuth Strategy
  if (SSO_CONFIG.google.clientID && SSO_CONFIG.google.clientSecret) {
    passport.use(new GoogleStrategy({
      clientID: SSO_CONFIG.google.clientID,
      clientSecret: SSO_CONFIG.google.clientSecret,
      callbackURL: SSO_CONFIG.google.callbackURL,
      scope: ['profile', 'email']
    }, async (accessToken: string, refreshToken: string, profile: SSOProfile, done: any) => {
      try {
        const result = await handleSSOLogin(profile, 'google');
        done(null, result);
      } catch (error) {
        done(error, null);
      }
    }));
  }

  // GitHub OAuth Strategy
  if (SSO_CONFIG.github.clientID && SSO_CONFIG.github.clientSecret) {
    passport.use(new GitHubStrategy({
      clientID: SSO_CONFIG.github.clientID,
      clientSecret: SSO_CONFIG.github.clientSecret,
      callbackURL: SSO_CONFIG.github.callbackURL,
      scope: ['user:email']
    }, async (accessToken: string, refreshToken: string, profile: SSOProfile, done: any) => {
      try {
        const result = await handleSSOLogin(profile, 'github');
        done(null, result);
      } catch (error) {
        done(error, null);
      }
    }));
  }

  // SSO Routes
  setupSSORoutes(app);
}

async function handleSSOLogin(profile: SSOProfile, provider: string) {
  const email = profile.emails?.[0]?.value;
  const name = profile.displayName || profile.id;
  
  if (!email) {
    throw new Error('Email not provided by SSO provider');
  }

  // Check if user exists
  let user = await storage.getUserByEmail(email);
  
  if (user) {
    // Update SSO info if needed
    if (!user.ssoProvider || user.ssoProvider !== provider) {
      await storage.updateUser(user.id, {
        ssoProvider: provider,
        ssoId: profile.id
      });
    }
    
    // Get associated tenant and restaurant
    const tenant = await storage.getTenantByUserId(user.id);
    const restaurant = await storage.getRestaurantByUserId(user.id);
    
    return { user: { ...user, provider }, tenant, restaurant };
  } else {
    // Create new user with SSO
    const restaurantName = `${name}'s Restaurant`;
    
    // Get default subscription plan
    const plans = await storage.getSubscriptionPlans();
    const defaultPlan = plans.find(p => p.name === "Free Trial") || plans[0];
    
    if (!defaultPlan) {
      throw new Error('No subscription plan available');
    }

    // Create new user
    const newUser = await storage.createUser({
      email,
      name,
      password: '', // No password for SSO users
      ssoProvider: provider,
      ssoId: profile.id
    });

    // Create tenant
    const tenant = await storage.createTenant({
      name: restaurantName,
      slug: generateSlug(restaurantName),
      subscriptionPlanId: defaultPlan.id,
      subscriptionStatus: 'trial',
      trialStartDate: new Date(),
      trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      maxRestaurants: defaultPlan.maxRestaurants,
    });

    // Create restaurant
    const restaurant = await storage.createRestaurant({
      name: restaurantName,
      tenantId: tenant.id,
      userId: newUser.id,
      setupCompleted: false,
      emailSettings: '{}',
    });

    return { user: { ...newUser, provider }, tenant, restaurant };
  }
}

function setupSSORoutes(app: Express) {
  // Google OAuth routes
  app.get('/api/auth/google', 
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=sso_failed' }),
    async (req: Request, res: Response) => {
      const sessionData = req.user as any;
      
      // Store session data
      (req.session as any).user = sessionData.user;
      (req.session as any).tenant = sessionData.tenant;
      (req.session as any).restaurant = sessionData.restaurant;
      
      // Redirect based on setup completion
      if (sessionData.restaurant?.setupCompleted) {
        res.redirect(`/${sessionData.tenant.id}/dashboard`);
      } else {
        res.redirect('/setup');
      }
    }
  );

  // GitHub OAuth routes
  app.get('/api/auth/github', 
    passport.authenticate('github', { scope: ['user:email'] })
  );

  app.get('/api/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/login?error=sso_failed' }),
    async (req: Request, res: Response) => {
      const sessionData = req.user as any;
      
      // Store session data
      (req.session as any).user = sessionData.user;
      (req.session as any).tenant = sessionData.tenant;
      (req.session as any).restaurant = sessionData.restaurant;
      
      // Redirect based on setup completion
      if (sessionData.restaurant?.setupCompleted) {
        res.redirect(`/${sessionData.tenant.id}/dashboard`);
      } else {
        res.redirect('/setup');
      }
    }
  );

  // SSO logout
  app.post('/api/auth/sso/logout', (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: 'Session destruction failed' });
        }
        res.json({ message: 'Logged out successfully' });
      });
    });
  });
}

// Middleware to check if user is authenticated via SSO
export function requireSSOAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
}