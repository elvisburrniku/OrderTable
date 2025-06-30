import { Request, Response, NextFunction } from "express";
import {
  tenants,
  users,
  tenantUsers,
  restaurants,
  roles,
  invitationTokens,
} from "../shared/schema";
import { eq, and } from "drizzle-orm";
import { storage } from "./storage";
import { db } from "./db";
import { systemSettings } from "./system-settings";
import bcrypt from "bcrypt";
import { z } from "zod";
import crypto from "crypto";
import { BrevoEmailService } from "./brevo-service";
import {
  requirePermission,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_REDIRECTS,
  getAllPermissions,
  updateRolePermissions,
  updateRoleRedirect,
} from "./permissions-middleware";

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

    const tenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId));

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
        },
      })
      .from(tenantUsers)
      .leftJoin(users, eq(tenantUsers.userId, users.id))
      .where(eq(tenantUsers.tenantId, tenantId));

    res.json({
      tenant: tenant[0],
      users: tenantUsersList,
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
        },
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
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, inviteData.email));

    if (existingUser.length > 0) {
      // Check if user is already in this tenant
      const existingTenantUser = await db
        .select()
        .from(tenantUsers)
        .where(
          and(
            eq(tenantUsers.tenantId, tenantId),
            eq(tenantUsers.userId, existingUser[0].id),
          ),
        );

      if (existingTenantUser.length > 0) {
        return res
          .status(400)
          .json({ message: "User is already a member of this tenant" });
      }

      // Add existing user to tenant
      await db.insert(tenantUsers).values({
        tenantId,
        userId: existingUser[0].id,
        role: inviteData.role,
      });

      return res.json({
        message: "Existing user added to tenant successfully",
      });
    }

    // Generate invitation token for new user
    const token = crypto.randomBytes(32).toString("hex");
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
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId));

    // Send invitation email
    const emailService = new BrevoEmailService();
    const inviteUrl = `${req.protocol}://${req.get("host")}/accept-invitation?token=${token}`;

    const emailSent = await emailService.sendEmail({
      to: [{ email: inviteData.email, name: inviteData.name }],
      subject: `You're invited to join ${tenant?.name || "Restaurant Team"}`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">

              <!-- Header -->
              <div style="background-color: #3B82F6; padding: 30px 30px 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: white; letter-spacing: -0.5px;">Team Invitation</h1>
              </div>

              <!-- Content -->
              <div style="padding: 30px;">
                <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.5;">Hello ${inviteData.name},</p>

                <p style="margin: 0 0 30px; font-size: 16px; color: #666; line-height: 1.6;">
                  You've been invited to join the team at <strong>${tenant?.name || "our restaurant"}</strong>. Click the button below to set up your account and choose your password.
                </p>

                <!-- Role Badge -->
                <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
                  <p style="margin: 0; color: #666; font-size: 14px;">Your role will be:</p>
                  <p style="margin: 5px 0 0; color: #333; font-size: 18px; font-weight: 600; text-transform: capitalize;">${inviteData.role}</p>
                </div>

                <!-- Action Button -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${inviteUrl}" style="background-color: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px;">Accept Invitation & Set Password</a>
                </div>

                <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #f59e0b;">
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    ⏰ This invitation will expire in 48 hours. Please accept it soon to gain access to the system.
                  </p>
                </div>

                <p style="margin: 30px 0 10px; font-size: 16px; color: #333;">Best regards,</p>
                <p style="margin: 0; font-size: 16px; color: #333; font-weight: 600;">${tenant?.name || "Restaurant Team"}</p>
              </div>

              <!-- Footer -->
              <div style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e5e5e5;">
                <p style="margin: 0; font-size: 12px; color: #666; line-height: 1.5; text-align: center;">
                  If you have any questions about this invitation, please contact the restaurant team directly.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
      textContent: `
Hello ${inviteData.name},

You've been invited to join the team at ${tenant?.name || "our restaurant"}. Visit this link to set up your account and choose your password:
${inviteUrl}

Your role will be: ${inviteData.role}

This invitation will expire in 48 hours.

Best regards,
${tenant?.name || "Restaurant Team"}`,
    });

    if (!emailSent) {
      return res
        .status(500)
        .json({ message: "Failed to send invitation email" });
    }

    res.json({
      message: "Invitation sent successfully",
      email: inviteData.email,
      expiresAt: expiresAt.toISOString(),
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
      return res
        .status(400)
        .json({ message: "Invitation has already been used" });
    }

    if (new Date() > invitation.expiresAt) {
      return res
        .status(400)
        .json({ message: "Invitation has expired", expired: true });
    }

    // Get tenant information
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, invitation.tenantId));

    res.json({
      token: invitation.token,
      email: invitation.email,
      name: invitation.name,
      tenantId: invitation.tenantId,
      role: invitation.role,
      tenantName: tenant?.name || "Restaurant Team",
      used: invitation.used,
      expired: false,
    });
  } catch (error) {
    console.error("Error validating invitation token:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Accept invitation and create user account
export async function acceptInvitation(req: Request, res: Response) {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    // Validate token again
    const [invitation] = await db
      .select()
      .from(invitationTokens)
      .where(eq(invitationTokens.token, token));

    if (!invitation) {
      return res.status(404).json({ message: "Invalid invitation token" });
    }

    if (invitation.used) {
      return res
        .status(400)
        .json({ message: "Invitation has already been used" });
    }

    if (new Date() > invitation.expiresAt) {
      return res.status(400).json({ message: "Invitation has expired" });
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, invitation.email));

    let userId;

    if (existingUser.length > 0) {
      // User exists, just add them to the tenant
      userId = existingUser[0].id;

      // Check if user is already in this tenant
      const existingTenantUser = await db
        .select()
        .from(tenantUsers)
        .where(
          and(
            eq(tenantUsers.tenantId, invitation.tenantId),
            eq(tenantUsers.userId, userId),
          ),
        );

      if (existingTenantUser.length > 0) {
        return res
          .status(400)
          .json({ message: "User is already a member of this tenant" });
      }
    } else {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          email: invitation.email,
          name: invitation.name,
          password: hashedPassword,
          restaurantName: null, // This will be null for team members
          ssoProvider: null,
          ssoId: null,
          createdAt: new Date(),
        })
        .returning();

      userId = newUser.id;
    }

    // Add user to tenant
    await db.insert(tenantUsers).values({
      tenantId: invitation.tenantId,
      userId: userId,
      role: invitation.role,
    });

    // Mark invitation as used
    await db
      .update(invitationTokens)
      .set({ used: true })
      .where(eq(invitationTokens.token, token));

    res.json({
      message: "Account created successfully",
      user: {
        id: userId,
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
      },
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
        .where(
          and(
            eq(tenantUsers.tenantId, tenantId),
            eq(tenantUsers.userId, userId),
          ),
        );
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
      .where(
        and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)),
      );

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
    const defaultPlanName = await systemSettings.getSetting(
      "default_subscription_plan",
    );
    const defaultPlan =
      await storage.getSubscriptionPlanByName(defaultPlanName);
    const subscriptionPlanId = defaultPlan?.id || 1; // Fallback to plan ID 1 if not found

    // Get trial days from system settings
    const trialDays = await systemSettings.getSetting("max_trial_days");
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
        status: "trial",
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
        and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)),
      );

    if (
      !tenantUser.length ||
      !["owner", "admin"].includes(tenantUser[0].role || "")
    ) {
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
          eq(tenantUsers.userId, inviterId),
        ),
      );

    if (
      !inviterTenantUser.length ||
      !["owner", "admin"].includes(inviterTenantUser[0].role || "")
    ) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    // Find or create user
    let [user] = await storage.db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      // For now, we'll just create a placeholder entry
      // In a real app, you'd send an invitation email
      return res
        .status(400)
        .json({
          message: "User not found. Please ask them to register first.",
        });
    }

    // Check if user is already in tenant
    const existingTenantUser = await storage.db
      .select()
      .from(tenantUsers)
      .where(
        and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.userId, user.id),
        ),
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
          eq(tenantUsers.userId, removerId),
        ),
      );

    if (
      !removerTenantUser.length ||
      !["owner", "admin"].includes(removerTenantUser[0].role || "")
    ) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    // Cannot remove owner
    const userToRemove = await storage.db
      .select()
      .from(tenantUsers)
      .where(
        and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.userId, userIdToRemove),
        ),
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
          eq(tenantUsers.userId, userIdToRemove),
        ),
      );

    res.json({ message: "User removed successfully" });
  } catch (error) {
    console.error("Error removing user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Get role permissions
export async function getRolePermissions(req: Request, res: Response) {
  try {
    console.log("Getting role permissions...");

    // Set proper headers for JSON response
    res.setHeader("Content-Type", "application/json");

    const rolePermissions = Object.entries(ROLE_PERMISSIONS).map(
      ([role, permissions]) => ({
        role,
        permissions: Array.isArray(permissions) ? permissions : [],
        redirect:
          ROLE_REDIRECTS[role as keyof typeof ROLE_REDIRECTS] || "dashboard",
      }),
    );

    const availablePermissions = getAllPermissions();

    const result = {
      roles: rolePermissions,
      availablePermissions,
    };

    console.log(
      "Sending role permissions result with",
      rolePermissions.length,
      "roles",
    );
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error getting role permissions:", error);
    res.setHeader("Content-Type", "application/json");
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Update role permissions
export async function updateRolePermissionsEndpoint(
  req: Request,
  res: Response,
) {
  try {
    const { role, permissions, redirect } = req.body;

    if (!role || !permissions) {
      return res
        .status(400)
        .json({ message: "Role and permissions are required" });
    }

    // Update redirect if provided
    if (redirect) {
      updateRoleRedirect(role, redirect);
    }

    // Update permissions
    const permissionsUpdated = updateRolePermissions(role, permissions);
    if (!permissionsUpdated) {
      return res
        .status(400)
        .json({ message: "Invalid role or cannot update owner permissions" });
    }

    res.json({ message: "Role permissions updated successfully" });
  } catch (error) {
    console.error("Error updating role permissions:", error);
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

  // Role permissions management (users with access_users permission)
  app.get(
    "/api/tenants/:tenantId/role-permissions",
    validateTenant,
    requirePermission(PERMISSIONS.ACCESS_USERS),
    getRolePermissions,
  );
  app.put(
    "/api/tenants/:tenantId/role-permissions",
    validateTenant,
    requirePermission(PERMISSIONS.ACCESS_USERS),
    updateRolePermissionsEndpoint,
  );

  // Invitation validation and acceptance
  app.get("/api/invitation/:token", validateInvitationToken);
  app.post("/api/invitation/:token/accept", acceptInvitation);
}
// Middleware to validate tenant access
function validateTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const sessionTenant = (req as any).session?.tenant;

    if (!sessionTenant) {
      return res.status(401).json({
        error: "No tenant session",
        message: "Please log in to access tenant resources",
      });
    }

    if (sessionTenant.id !== tenantId) {
      return res.status(403).json({
        error: "Tenant access denied",
        message: "You don't have access to this tenant",
      });
    }

    next();
  } catch (error) {
    console.error("Tenant validation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
