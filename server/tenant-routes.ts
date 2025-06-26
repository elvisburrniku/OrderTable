import { Request, Response } from "express";
import { tenants, users, tenantUsers, restaurants, roles, invitationTokens } from "../shared/schema";
import { eq, and } from "drizzle-orm";
import { storage } from "./storage";
import { db } from "./db";
import { systemSettings } from "./system-settings";
import bcrypt from "bcrypt";
import { z } from "zod";
import crypto from "crypto";
import { BrevoEmailService } from "./brevo-service";

// User invitation schema
const inviteUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.string().min(1),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.string().min(1).optional(),
});

const createRoleSchema = z.object({
  name: z.string().min(2),
  displayName: z.string().min(2),
  permissions: z.array(z.string()).min(1),
});

// Get tenant information
export async function getTenant(req: Request, res: Response) {
  try {
    const tenantId = parseInt(req.params.tenantId);

    const tenant = await db.select().from(tenants).where(eq(tenants.id, tenantId));

    if (!tenant.length) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    // Get tenant users
    const tenantUsersList = await db
      .select({
        tenantId: tenantUsers.tenantId,
        userId: tenantUsers.userId,
        role: tenantUsers.role,
        createdAt: tenantUsers.createdAt,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
        }
      })
      .from(tenantUsers)
      .leftJoin(users, eq(tenantUsers.userId, users.id))
      .where(eq(tenantUsers.tenantId, tenantId));

    res.json({
      tenant: tenant[0],
      users: tenantUsersList
    });
  } catch (error) {
    console.error("Error fetching tenant:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Get tenant users (dedicated endpoint)
export async function getTenantUsers(req: Request, res: Response) {
  try {
    const tenantId = parseInt(req.params.tenantId);

    const tenantUsersList = await db
      .select({
        tenantId: tenantUsers.tenantId,
        userId: tenantUsers.userId,
        role: tenantUsers.role,
        createdAt: tenantUsers.createdAt,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
          restaurantName: users.restaurantName,
          ssoProvider: users.ssoProvider,
        }
      })
      .from(tenantUsers)
      .leftJoin(users, eq(tenantUsers.userId, users.id))
      .where(eq(tenantUsers.tenantId, tenantId));

    res.json(tenantUsersList);
  } catch (error) {
    console.error("Error fetching tenant users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Invite user to tenant
export async function inviteTenantUser(req: Request, res: Response) {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const inviteData = inviteUserSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, inviteData.email));
    
    if (existingUser.length > 0) {
      // Check if user is already in this tenant
      const existingTenantUser = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.userId, existingUser[0].id)
        ));

      if (existingTenantUser.length > 0) {
        return res.status(400).json({ message: "User is already a member of this tenant" });
      }

      // Add existing user to tenant
      await db.insert(tenantUsers).values({
        tenantId,
        userId: existingUser[0].id,
        role: inviteData.role,
      });

      return res.json({ message: "Existing user added to tenant successfully" });
    }

    // Generate invitation token for new user
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // Token expires in 48 hours

    // Store invitation token
    await db.insert(invitationTokens).values({
      token,
      email: inviteData.email,
      name: inviteData.name,
      tenantId,
      role: inviteData.role,
      invitedByUserId: (req as any).user?.id,
      expiresAt,
    });

    // Get tenant information for email
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    
    // Send invitation email
    const emailService = new BrevoEmailService();
    const inviteUrl = `${req.protocol}://${req.get('host')}/accept-invitation?token=${token}`;
    
    const emailSent = await emailService.sendEmail({
      to: [{ email: inviteData.email, name: inviteData.name }],
      subject: `You're invited to join ${tenant?.name || 'Restaurant Team'}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">You're invited to join ${tenant?.name || 'Restaurant Team'}</h2>
          <p>Hello ${inviteData.name},</p>
          <p>You've been invited to join the team at ${tenant?.name || 'our restaurant'}. Click the link below to set up your account and choose your password.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Accept Invitation & Set Password</a>
          </div>
          <p>Your role will be: <strong>${inviteData.role}</strong></p>
          <p style="color: #666;">This invitation will expire in 48 hours.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #999;">If the button doesn't work, copy and paste this link into your browser:<br>
          <span style="word-break: break-all;">${inviteUrl}</span></p>
        </div>
      `,
      textContent: `You're invited to join ${tenant?.name || 'Restaurant Team'}

Hello ${inviteData.name},

You've been invited to join the team at ${tenant?.name || 'our restaurant'}. Visit this link to set up your account and choose your password:
${inviteUrl}

Your role will be: ${inviteData.role}

This invitation will expire in 48 hours.`,
    });

    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send invitation email" });
    }

    res.json({ 
      message: "Invitation sent successfully",
      email: inviteData.email,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error("Error inviting user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Validate invitation token
export async function validateInvitationToken(req: Request, res: Response) {
  try {
    const { token } = req.params;

    const [invitation] = await db
      .select()
      .from(invitationTokens)
      .where(eq(invitationTokens.token, token));

    if (!invitation) {
      return res.status(404).json({ message: "Invalid invitation token" });
    }

    if (invitation.used) {
      return res.status(400).json({ message: "Invitation has already been used" });
    }

    if (new Date() > invitation.expiresAt) {
      return res.status(400).json({ message: "Invitation has expired", expired: true });
    }

    // Get tenant information
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, invitation.tenantId));

    res.json({
      email: invitation.email,
      name: invitation.name,
      tenantName: tenant?.name || 'Restaurant Team',
      role: invitation.role,
      expired: false
    });
  } catch (error) {
    console.error("Error validating invitation token:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Accept invitation and create user account
export async function acceptInvitation(req: Request, res: Response) {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "Token and password are required" });
    }

    const [invitation] = await db
      .select()
      .from(invitationTokens)
      .where(eq(invitationTokens.token, token));

    if (!invitation) {
      return res.status(404).json({ message: "Invalid invitation token" });
    }

    if (invitation.used) {
      return res.status(400).json({ message: "Invitation has already been used" });
    }

    if (new Date() > invitation.expiresAt) {
      return res.status(400).json({ message: "Invitation has expired" });
    }

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, invitation.email));
    
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const [newUser] = await db.insert(users).values({
      email: invitation.email,
      name: invitation.name,
      password: hashedPassword,
      restaurantName: null,
    }).returning();

    // Add user to tenant
    await db.insert(tenantUsers).values({
      tenantId: invitation.tenantId,
      userId: newUser.id,
      role: invitation.role,
    });

    // Mark invitation as used
    await db
      .update(invitationTokens)
      .set({ 
        used: true, 
        usedAt: new Date() 
      })
      .where(eq(invitationTokens.token, token));

    res.json({ 
      message: "Account created successfully",
      user: { 
        id: newUser.id, 
        email: newUser.email, 
        name: newUser.name 
      }
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Update tenant user
export async function updateTenantUser(req: Request, res: Response) {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const userId = parseInt(req.params.userId);
    const updateData = updateUserSchema.parse(req.body);

    // Update user basic info if provided
    if (updateData.name || updateData.email) {
      await storage.updateUser(userId, {
        name: updateData.name,
        email: updateData.email,
      });
    }

    // Update tenant role if provided
    if (updateData.role) {
      await db
        .update(tenantUsers)
        .set({ role: updateData.role })
        .where(and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.userId, userId)
        ));
    }

    res.json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Remove user from tenant
export async function removeTenantUser(req: Request, res: Response) {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const userId = parseInt(req.params.userId);

    await db
      .delete(tenantUsers)
      .where(and(
        eq(tenantUsers.tenantId, tenantId),
        eq(tenantUsers.userId, userId)
      ));

    res.json({ message: "User removed from tenant successfully" });
  } catch (error) {
    console.error("Error removing user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Get tenant roles
export async function getTenantRoles(req: Request, res: Response) {
  try {
    const tenantId = parseInt(req.params.tenantId);

    const tenantRoles = await db
      .select()
      .from(roles)
      .where(eq(roles.tenantId, tenantId));

    // Include system roles (not tenant-specific)
    const systemRoles = await db
      .select()
      .from(roles)
      .where(eq(roles.isSystem, true));

    const allRoles = [...systemRoles, ...tenantRoles];

    res.json(allRoles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Create custom role for tenant
export async function createTenantRole(req: Request, res: Response) {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const roleData = createRoleSchema.parse(req.body);

    const [newRole] = await db
      .insert(roles)
      .values({
        tenantId,
        name: roleData.name,
        displayName: roleData.displayName,
        permissions: JSON.stringify(roleData.permissions),
        isSystem: false,
      })
      .returning();

    res.json(newRole);
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Create new tenant
export async function createTenant(req: Request, res: Response) {
  try {
    const { name, slug } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get default subscription plan from system settings
    const defaultPlanName = await systemSettings.getSetting('default_subscription_plan');
    const defaultPlan = await storage.getSubscriptionPlanByName(defaultPlanName);
    const subscriptionPlanId = defaultPlan?.id || 1; // Fallback to plan ID 1 if not found

    // Get trial days from system settings
    const trialDays = await systemSettings.getSetting('max_trial_days');
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + trialDays);

    // Create the tenant with default values from system settings
    const [newTenant] = await storage.db
      .insert(tenants)
      .values({
        name,
        slug,
        subscriptionPlanId,
        trialEndDate,
        status: 'trial',
      })
      .returning();

    // Add the creating user as owner
    await storage.db.insert(tenantUsers).values({
      tenantId: newTenant.id,
      userId,
      role: "owner",
    });

    res.status(201).json(newTenant);
  } catch (error) {
    console.error("Error creating tenant:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Update tenant
export async function updateTenant(req: Request, res: Response) {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const { name, slug } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if user has permission to update tenant
    const tenantUser = await storage.db
      .select()
      .from(tenantUsers)
      .where(
        and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.userId, userId)
        )
      );

    if (!tenantUser.length || !["owner", "admin"].includes(tenantUser[0].role || "")) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const [updatedTenant] = await storage.db
      .update(tenants)
      .set({
        name,
        slug,
      })
      .where(eq(tenants.id, tenantId))
      .returning();

    res.json(updatedTenant);
  } catch (error) {
    console.error("Error updating tenant:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Invite user to tenant
export async function inviteUserToTenant(req: Request, res: Response) {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const { email, role } = req.body;
    const inviterId = req.user?.id;

    if (!inviterId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if inviter has permission
    const inviterTenantUser = await storage.db
      .select()
      .from(tenantUsers)
      .where(
        and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.userId, inviterId)
        )
      );

    if (!inviterTenantUser.length || !["owner", "admin"].includes(inviterTenantUser[0].role || "")) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    // Find or create user
    let [user] = await storage.db.select().from(users).where(eq(users.email, email));

    if (!user) {
      // For now, we'll just create a placeholder entry
      // In a real app, you'd send an invitation email
      return res.status(400).json({ message: "User not found. Please ask them to register first." });
    }

    // Check if user is already in tenant
    const existingTenantUser = await storage.db
      .select()
      .from(tenantUsers)
      .where(
        and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.userId, user.id)
        )
      );

    if (existingTenantUser.length) {
      return res.status(400).json({ message: "User already in tenant" });
    }

    // Add user to tenant
    const [newTenantUser] = await storage.db
      .insert(tenantUsers)
      .values({
        tenantId,
        userId: user.id,
        role,
      })
      .returning();

    res.status(201).json(newTenantUser);
  } catch (error) {
    console.error("Error inviting user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Remove user from tenant
export async function removeUserFromTenant(req: Request, res: Response) {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const userIdToRemove = parseInt(req.params.userId);
    const removerId = req.user?.id;

    if (!removerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if remover has permission
    const removerTenantUser = await storage.db
      .select()
      .from(tenantUsers)
      .where(
        and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.userId, removerId)
        )
      );

    if (!removerTenantUser.length || !["owner", "admin"].includes(removerTenantUser[0].role || "")) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    // Cannot remove owner
    const userToRemove = await storage.db
      .select()
      .from(tenantUsers)
      .where(
        and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.userId, userIdToRemove)
        )
      );

    if (userToRemove.length && userToRemove[0].role === "owner") {
      return res.status(400).json({ message: "Cannot remove tenant owner" });
    }

    // Remove user from tenant
    await storage.db
      .delete(tenantUsers)
      .where(
        and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.userId, userIdToRemove)
        )
      );

    res.json({ message: "User removed successfully" });
  } catch (error) {
    console.error("Error removing user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Setup function to register all tenant routes
export function setupTenantRoutes(app: any) {
  app.get("/api/tenant/:tenantId", getTenant);
  app.post("/api/tenant", createTenant);
  app.put("/api/tenant/:tenantId", updateTenant);
  app.post("/api/tenant/:tenantId/invite", inviteUserToTenant);
  app.delete("/api/tenant/:tenantId/users/:userId", removeUserFromTenant);
}