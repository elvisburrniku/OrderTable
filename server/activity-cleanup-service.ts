import { storage } from "./storage-config";

export class ActivityCleanupService {
  private isRunning = false;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {}

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log("Starting activity cleanup service...");
    
    // Run cleanup daily at 2 AM
    const runDaily = () => {
      const now = new Date();
      const nextRun = new Date();
      nextRun.setHours(2, 0, 0, 0); // 2:00 AM
      
      // If it's already past 2 AM today, schedule for tomorrow
      if (now > nextRun) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      
      const msUntilNextRun = nextRun.getTime() - now.getTime();
      
      setTimeout(() => {
        this.performCleanup();
        // Schedule daily runs
        this.cleanupInterval = setInterval(() => {
          this.performCleanup();
        }, 24 * 60 * 60 * 1000); // 24 hours
      }, msUntilNextRun);
    };

    // Run initial cleanup after 5 minutes, then schedule daily
    setTimeout(() => {
      this.performCleanup();
      runDaily();
    }, 5 * 60 * 1000);
  }

  stop() {
    this.isRunning = false;
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    console.log("Activity cleanup service stopped");
  }

  private async performCleanup() {
    try {
      console.log("Starting activity log cleanup...");
      
      // Calculate date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      console.log(`Deleting activity logs older than: ${thirtyDaysAgo.toISOString()}`);
      
      // Delete old activity logs
      const deletedCount = await storage.deleteOldActivityLogs(thirtyDaysAgo);
      
      if (deletedCount > 0) {
        console.log(`Activity cleanup completed: ${deletedCount} old activity logs deleted`);
      } else {
        console.log("Activity cleanup completed: No old activity logs found");
      }
      
    } catch (error) {
      console.error("Activity cleanup error:", error);
    }
  }

  // Manual cleanup method for testing
  async runCleanupNow(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return await storage.deleteOldActivityLogs(thirtyDaysAgo);
  }
}

// Create singleton instance
export const activityCleanupService = new ActivityCleanupService();