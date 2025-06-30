import { Skeleton } from "@/components/ui/skeleton";

export function RestaurantInfoSkeleton() {
  return (
    <div className="space-y-4 p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/20">
      {/* Restaurant name */}
      <Skeleton className="h-8 w-48 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600" />
      
      {/* Restaurant description */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full bg-gray-200 dark:bg-gray-700" />
        <Skeleton className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700" />
      </div>
      
      {/* Opening hours */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-32 bg-gray-200 dark:bg-gray-700" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="space-y-4 p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/20">
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-6 bg-gray-200 dark:bg-gray-700" />
        <Skeleton className="h-6 w-32 bg-gray-200 dark:bg-gray-700" />
        <Skeleton className="h-6 w-6 bg-gray-200 dark:bg-gray-700" />
      </div>
      
      {/* Days of week */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
      
      {/* Calendar dates */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="h-10 w-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700" 
          />
        ))}
      </div>
    </div>
  );
}

export function TimeSlotsSkeletonGrid() {
  return (
    <div className="space-y-4 p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/20">
      <Skeleton className="h-6 w-40 bg-gray-200 dark:bg-gray-700" />
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="h-12 w-full bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-xl"
          />
        ))}
      </div>
    </div>
  );
}

export function BookingFormSkeleton() {
  return (
    <div className="space-y-6 p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/20">
      {/* Form title */}
      <Skeleton className="h-7 w-48 bg-gray-200 dark:bg-gray-700" />
      
      {/* Form fields */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24 bg-gray-200 dark:bg-gray-700" />
            <Skeleton className="h-10 w-full bg-gray-100 dark:bg-gray-800 rounded-lg" />
          </div>
        ))}
      </div>
      
      {/* Submit button */}
      <Skeleton className="h-12 w-full bg-gradient-to-r from-blue-200 to-blue-300 dark:from-blue-800 dark:to-blue-700 rounded-lg" />
    </div>
  );
}

export function TableSelectionSkeleton() {
  return (
    <div className="space-y-4 p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/20">
      <Skeleton className="h-6 w-36 bg-gray-200 dark:bg-gray-700" />
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-16 w-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 rounded-lg" />
            <Skeleton className="h-4 w-3/4 mx-auto bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Animated shimmer effect for enhanced visual appeal
export function ShimmerSkeleton({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      {children}
    </div>
  );
}