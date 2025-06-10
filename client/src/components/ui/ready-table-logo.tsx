interface ReadyTableLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
}

export function ReadyTableLogo({ 
  className = "", 
  size = 32, 
  showText = true,
  textClassName = "text-xl font-bold"
}: ReadyTableLogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mr-2"
      >
        {/* Table surface */}
        <rect
          x="6"
          y="18"
          width="36"
          height="24"
          rx="3"
          fill="currentColor"
          className="text-emerald-600"
        />
        
        {/* Table legs */}
        <rect x="10" y="36" width="3" height="8" fill="currentColor" className="text-emerald-700" />
        <rect x="35" y="36" width="3" height="8" fill="currentColor" className="text-emerald-700" />
        
        {/* Reservation indicator - stylized "R" */}
        <circle cx="24" cy="30" r="8" fill="white" />
        <path
          d="M20 26h4c1.1 0 2 .9 2 2s-.9 2-2 2h-2l2.5 4h-2l-2.5-4V26z"
          fill="currentColor"
          className="text-emerald-600"
        />
        
        {/* Ready indicator - checkmark */}
        <circle cx="32" cy="24" r="4" fill="currentColor" className="text-green-500" />
        <path
          d="M30 24l1.5 1.5L34 22"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      
      {showText && (
        <span className={textClassName}>ReadyTable</span>
      )}
    </div>
  );
}