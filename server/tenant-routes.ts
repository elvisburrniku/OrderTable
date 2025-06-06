import { Request, Response } from "express";
import { tenants, users, tenantUsers, restaurants } from "../shared/schema";
import { eq, and } from "drizzle-orm";
import { storage } from "./storage";

// Get tenant information
export async function getTenant(req: Request, res: Response) {
  try {
    const tenantId = parseInt(req.params.tenantId);

    const tenant = await storage.db.select().from(tenants).where(eq(tenants.id, tenantId));

    if (!tenant.length) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    // Get tenant users
    const tenantUsersList = await storage.db
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

// Create new tenant
export async function createTenant(req: Request, res: Response) {
  try {
    const { name, slug } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Create the tenant
    const [newTenant] = await storage.db
      .insert(tenants)
      .values({
        name,
        slug,
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