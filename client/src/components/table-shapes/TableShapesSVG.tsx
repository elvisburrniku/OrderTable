import React from 'react';

interface TableSVGProps {
  width?: number;
  height?: number;
  className?: string;
}

export const SquareTable1Person: React.FC<TableSVGProps> = ({ width = 40.91, height = 52.73, className = "" }) => (
  <svg 
    preserveAspectRatio="xMidYMid" 
    viewBox="0 0 90 116" 
    style={{ width: `${width}px`, height: `${height}px` }}
    className={className}
  >
    <defs>
      <style>
        {`.cls-2, .cls-3 { fill: #4e4e4e; }
         .cls-2 { fill-rule: evenodd; opacity: 0.8; }`}
      </style>
    </defs>
    <g>
      <path d="M27.000,-0.000 L61.000,-0.000 C65.418,-0.000 69.000,3.582 69.000,8.000 C69.000,12.418 65.418,16.000 61.000,16.000 L27.000,16.000 C22.582,16.000 19.000,12.418 19.000,8.000 C19.000,3.582 22.582,-0.000 27.000,-0.000 Z" className="cls-2"></path>
      <rect y="8" width="90" height="100" className="cls-3"></rect>
    </g>
  </svg>
);

export const CircleTable1Person: React.FC<TableSVGProps> = ({ width = 43.64, height = 43.64, className = "" }) => (
  <svg 
    preserveAspectRatio="xMidYMid" 
    viewBox="0 0 96 96" 
    style={{ width: `${width}px`, height: `${height}px` }}
    className={className}
  >
    <defs>
      <style>
        {`.cls-1, .cls-3 { fill: #4e4e4e; }
         .cls-1 { opacity: 0.8; fill-rule: evenodd; }`}
      </style>
    </defs>
    <g>
      <path d="M28.000,-0.000 L62.000,-0.000 C66.418,-0.000 70.000,3.582 70.000,8.000 C70.000,12.418 66.418,16.000 62.000,16.000 L28.000,16.000 C23.582,16.000 20.000,12.418 20.000,8.000 C20.000,3.582 23.582,-0.000 28.000,-0.000 Z" transform="translate(3)" className="cls-1"></path>
      <circle cx="48" cy="48" r="45" className="cls-3"></circle>
    </g>
  </svg>
);

export const SquareTable2Person: React.FC<TableSVGProps> = ({ width = 40.91, height = 52.73, className = "" }) => (
  <svg 
    preserveAspectRatio="xMidYMid" 
    viewBox="0 0 90 116" 
    style={{ width: `${width}px`, height: `${height}px` }}
    className={className}
  >
    <defs>
      <style>
        {`.cls-1, .cls-2 { fill: #4e4e4e; }
         .cls-1 { opacity: 0.8; fill-rule: evenodd; }`}
      </style>
    </defs>
    <g>
      <path d="M27.000,100.000 L61.000,100.000 C65.418,100.000 69.000,103.582 69.000,108.000 C69.000,112.418 65.418,116.000 61.000,116.000 L27.000,116.000 C22.582,116.000 19.000,112.418 19.000,108.000 C19.000,103.582 22.582,100.000 27.000,100.000 Z" className="cls-1"></path>
      <path d="M27.000,-0.000 L61.000,-0.000 C65.418,-0.000 69.000,3.582 69.000,8.000 C69.000,12.418 65.418,16.000 61.000,16.000 L27.000,16.000 C22.582,16.000 19.000,12.418 19.000,8.000 C19.000,3.582 22.582,-0.000 27.000,-0.000 Z" className="cls-1"></path>
      <rect y="8" width="90" height="100" className="cls-2"></rect>
    </g>
  </svg>
);

export const CircleTable2Person: React.FC<TableSVGProps> = ({ width = 43.64, height = 43.64, className = "" }) => (
  <svg 
    preserveAspectRatio="xMidYMid" 
    viewBox="0 0 96 96" 
    style={{ width: `${width}px`, height: `${height}px` }}
    className={className}
  >
    <defs>
      <style>
        {`.cls-1, .cls-2 { fill: #4e4e4e; }
         .cls-1 { opacity: 0.8; fill-rule: evenodd; }`}
      </style>
    </defs>
    <g>
      <path d="M28.000,-0.000 L62.000,-0.000 C66.418,-0.000 70.000,3.582 70.000,8.000 C70.000,12.418 66.418,16.000 62.000,16.000 L28.000,16.000 C23.582,16.000 20.000,12.418 20.000,8.000 C20.000,3.582 23.582,-0.000 28.000,-0.000 Z" transform="translate(3)" className="cls-1"></path>
      <path d="M28.000,80.000 L62.000,80.000 C66.418,80.000 70.000,83.582 70.000,88.000 C70.000,92.418 66.418,96.000 62.000,96.000 L28.000,96.000 C23.582,96.000 20.000,92.418 20.000,88.000 C20.000,83.582 23.582,80.000 28.000,80.000 Z" transform="translate(3)" className="cls-1"></path>
      <circle cx="48" cy="48" r="45" className="cls-2"></circle>
    </g>
  </svg>
);

export const CircleTable3Person: React.FC<TableSVGProps> = ({ width = 50, height = 46.82, className = "" }) => (
  <svg 
    preserveAspectRatio="xMidYMid" 
    viewBox="0 0 110.563 103.313" 
    style={{ width: `${width}px`, height: `${height}px` }}
    className={className}
  >
    <defs>
      <style>
        {`.cls-1, .cls-2 { fill: #4e4e4e; }
         .cls-1 { opacity: 0.8; fill-rule: evenodd; }`}
      </style>
    </defs>
    <g>
      <path d="M18.060,94.540 L1.060,65.095 C-1.150,61.269 0.161,56.376 3.988,54.167 C7.814,51.958 12.707,53.269 14.916,57.095 L31.916,86.540 C34.125,90.366 32.814,95.259 28.988,97.468 C25.161,99.677 20.269,98.366 18.060,94.540 Z" className="cls-1"></path>
      <path d="M109.492,65.229 L92.492,94.674 C90.283,98.500 85.390,99.811 81.564,97.602 C77.738,95.393 76.427,90.500 78.636,86.674 L95.636,57.229 C97.845,53.403 102.738,52.092 106.564,54.301 C110.390,56.510 111.701,61.403 109.492,65.229 Z" className="cls-1"></path>
      <path d="M38.844,-0.000 L72.844,-0.000 C77.262,-0.000 80.844,3.582 80.844,8.000 C80.844,12.418 77.262,16.000 72.844,16.000 L38.844,16.000 C34.426,16.000 30.844,12.418 30.844,8.000 C30.844,3.582 34.426,-0.000 38.844,-0.000 Z" className="cls-1"></path>
      <circle cx="55.454" cy="53.328" r="49.985" className="cls-2"></circle>
    </g>
  </svg>
);

export const SquareTable4Person: React.FC<TableSVGProps> = ({ width = 77.27, height = 52.73, className = "" }) => (
  <svg 
    preserveAspectRatio="xMidYMid" 
    viewBox="0 0 170 116" 
    style={{ width: `${width}px`, height: `${height}px` }}
    className={className}
  >
    <defs>
      <style>
        {`.cls-1, .cls-2 { fill: #4e4e4e; }
         .cls-1 { opacity: 0.8; fill-rule: evenodd; }`}
      </style>
    </defs>
    <g>
      <path d="M29.000,100.000 L63.000,100.000 C67.418,100.000 71.000,103.582 71.000,108.000 C71.000,112.418 67.418,116.000 63.000,116.000 L29.000,116.000 C24.582,116.000 21.000,112.418 21.000,108.000 C21.000,103.582 24.582,100.000 29.000,100.000 Z" className="cls-1"></path>
      <path d="M29.000,-0.000 L63.000,-0.000 C67.418,-0.000 71.000,3.582 71.000,8.000 C71.000,12.418 67.418,16.000 63.000,16.000 L29.000,16.000 C24.582,16.000 21.000,12.418 21.000,8.000 C21.000,3.582 24.582,-0.000 29.000,-0.000 Z" className="cls-1"></path>
      <path d="M107.000,100.000 L141.000,100.000 C145.418,100.000 149.000,103.582 149.000,108.000 C149.000,112.418 145.418,116.000 141.000,116.000 L107.000,116.000 C102.582,116.000 99.000,112.418 99.000,108.000 C99.000,103.582 102.582,100.000 107.000,100.000 Z" className="cls-1"></path>
      <path d="M107.000,-0.000 L141.000,-0.000 C145.418,-0.000 149.000,3.582 149.000,8.000 C149.000,12.418 145.418,16.000 141.000,16.000 L107.000,16.000 C102.582,16.000 99.000,12.418 99.000,8.000 C99.000,3.582 102.582,-0.000 107.000,-0.000 Z" className="cls-1"></path>
      <rect y="8" width="170" height="100" className="cls-2"></rect>
    </g>
  </svg>
);

export const SquareTable4PersonCompact: React.FC<TableSVGProps> = ({ width = 61.82, height = 61.82, className = "" }) => (
  <svg 
    preserveAspectRatio="xMidYMid" 
    viewBox="0 0 136 136" 
    style={{ width: `${width}px`, height: `${height}px` }}
    className={className}
  >
    <defs>
      <style>
        {`.cls-1, .cls-2 { fill: #4e4e4e; }
         .cls-1 { opacity: 0.8; fill-rule: evenodd; }`}
      </style>
    </defs>
    <g>
      <path d="M51.000,120.000 L85.000,120.000 C89.418,120.000 93.000,123.582 93.000,128.000 C93.000,132.418 89.418,136.000 85.000,136.000 L51.000,136.000 C46.582,136.000 43.000,132.418 43.000,128.000 C43.000,123.582 46.582,120.000 51.000,120.000 Z" className="cls-1"></path>
      <path d="M128.000,43.000 C132.418,43.000 136.000,46.582 136.000,51.000 L136.000,85.000 C136.000,89.418 132.418,93.000 128.000,93.000 C123.582,93.000 120.000,89.418 120.000,85.000 L120.000,51.000 C120.000,46.582 123.582,43.000 128.000,43.000 Z" className="cls-1"></path>
      <path d="M8.000,43.000 C12.418,43.000 16.000,46.582 16.000,51.000 L16.000,85.000 C16.000,89.418 12.418,93.000 8.000,93.000 C3.582,93.000 -0.000,89.418 -0.000,85.000 L-0.000,51.000 C-0.000,46.582 3.582,43.000 8.000,43.000 Z" className="cls-1"></path>
      <path d="M51.000,-0.000 L85.000,-0.000 C89.418,-0.000 93.000,3.582 93.000,8.000 C93.000,12.418 89.418,16.000 85.000,16.000 L51.000,16.000 C46.582,16.000 43.000,12.418 43.000,8.000 C43.000,3.582 46.582,-0.000 51.000,-0.000 Z" className="cls-1"></path>
      <rect x="8" y="8" width="120" height="120" className="cls-2"></rect>
    </g>
  </svg>
);

export const CircleTable4Person: React.FC<TableSVGProps> = ({ width = 52.73, height = 52.73, className = "" }) => (
  <svg 
    preserveAspectRatio="xMidYMid" 
    viewBox="0 0 116 116" 
    style={{ width: `${width}px`, height: `${height}px` }}
    className={className}
  >
    <defs>
      <style>
        {`.cls-1, .cls-2 { fill: #4e4e4e; }
         .cls-1 { opacity: 0.8; fill-rule: evenodd; }`}
      </style>
    </defs>
    <g>
      <path d="M41.000,-0.000 L75.000,-0.000 C79.418,-0.000 83.000,3.582 83.000,8.000 C83.000,12.418 79.418,16.000 75.000,16.000 L41.000,16.000 C36.582,16.000 33.000,12.418 33.000,8.000 C33.000,3.582 36.582,-0.000 41.000,-0.000 Z" className="cls-1"></path>
      <path d="M41.000,100.000 L75.000,100.000 C79.418,100.000 83.000,103.582 83.000,108.000 C83.000,112.418 79.418,116.000 75.000,116.000 L41.000,116.000 C36.582,116.000 33.000,112.418 33.000,108.000 C33.000,103.582 36.582,100.000 41.000,100.000 Z" className="cls-1"></path>
      <path d="M108.000,33.000 C112.418,33.000 116.000,36.582 116.000,41.000 L116.000,75.000 C116.000,79.418 112.418,83.000 108.000,83.000 C103.582,83.000 100.000,79.418 100.000,75.000 L100.000,41.000 C100.000,36.582 103.582,33.000 108.000,33.000 Z" className="cls-1"></path>
      <path d="M8.000,33.000 C12.418,33.000 16.000,36.582 16.000,41.000 L16.000,75.000 C16.000,79.418 12.418,83.000 8.000,83.000 C3.582,83.000 -0.000,79.418 -0.000,75.000 L-0.000,41.000 C-0.000,36.582 3.582,33.000 8.000,33.000 Z" className="cls-1"></path>
      <circle cx="58" cy="58" r="55" className="cls-2"></circle>
    </g>
  </svg>
);

export const CircleTable5Person: React.FC<TableSVGProps> = ({ width = 63.64, height = 60.91, className = "" }) => (
  <svg 
    preserveAspectRatio="xMidYMid" 
    viewBox="0 0 139.75 133.906" 
    style={{ width: `${width}px`, height: `${height}px` }}
    className={className}
  >
    <defs>
      <style>
        {`.cls-1, .cls-2 { fill: #4e4e4e; }
         .cls-1 { opacity: 0.8; fill-rule: evenodd; }`}
      </style>
    </defs>
    <g>
      <path d="M0.393,62.233 L10.899,29.897 C12.265,25.695 16.778,23.396 20.980,24.761 C25.182,26.126 27.482,30.640 26.116,34.842 L15.610,67.178 C14.244,71.380 9.731,73.679 5.529,72.314 C1.327,70.949 -0.973,66.435 0.393,62.233 Z" className="cls-1"></path>
      <path d="M42.557,131.407 L15.050,111.422 C11.476,108.825 10.683,103.822 13.281,100.248 C15.877,96.673 20.880,95.881 24.455,98.478 L51.961,118.463 C55.536,121.060 56.328,126.063 53.731,129.637 C51.134,133.212 46.131,134.004 42.557,131.407 Z" className="cls-1"></path>
      <path d="M123.890,112.380 L96.383,132.365 C92.809,134.962 87.806,134.169 85.209,130.595 C82.612,127.020 83.404,122.017 86.978,119.420 L114.485,99.436 C118.059,96.839 123.062,97.631 125.659,101.206 C128.256,104.780 127.464,109.783 123.890,112.380 Z" className="cls-1"></path>
      <path d="M128.848,29.090 L139.355,61.426 C140.720,65.628 138.421,70.141 134.219,71.506 C130.017,72.871 125.503,70.572 124.138,66.370 L113.632,34.034 C112.266,29.832 114.566,25.319 118.768,23.953 C122.970,22.588 127.483,24.888 128.848,29.090 Z" className="cls-1"></path>
      <path d="M53.219,-0.000 L87.219,-0.000 C91.637,-0.000 95.219,3.582 95.219,8.000 C95.219,12.418 91.637,16.000 87.219,16.000 L53.219,16.000 C48.801,16.000 45.219,12.418 45.219,8.000 C45.219,3.582 48.801,-0.000 53.219,-0.000 Z" className="cls-1"></path>
      <circle cx="70.313" cy="67.078" r="65" className="cls-2"></circle>
    </g>
  </svg>
);

export const CircleTable6Person: React.FC<TableSVGProps> = ({ width = 70.91, height = 71.82, className = "" }) => (
  <svg 
    preserveAspectRatio="xMidYMid" 
    viewBox="0 0 156.219 157.594" 
    style={{ width: `${width}px`, height: `${height}px` }}
    className={className}
  >
    <defs>
      <style>
        {`.cls-1, .cls-2 { fill: #4e4e4e; }
         .cls-1 { opacity: 0.8; fill-rule: evenodd; }`}
      </style>
    </defs>
    <g>
      <path d="M1.064,53.842 L18.064,24.397 C20.273,20.571 25.166,19.260 28.992,21.469 C32.818,23.678 34.129,28.571 31.920,32.397 L14.920,61.842 C12.711,65.668 7.818,66.979 3.992,64.770 C0.166,62.561 -1.145,57.668 1.064,53.842 Z" className="cls-1"></path>
      <path d="M18.064,133.574 L1.064,104.129 C-1.145,100.303 0.166,95.410 3.992,93.201 C7.818,90.992 12.711,92.303 14.920,96.129 L31.920,125.574 C34.129,129.400 32.818,134.293 28.992,136.502 C25.166,138.711 20.273,137.400 18.064,133.574 Z" className="cls-1"></path>
      <path d="M94.690,157.586 L60.690,157.586 C56.272,157.586 52.690,154.004 52.690,149.586 C52.690,145.168 56.272,141.586 60.690,141.586 L94.690,141.586 C99.108,141.586 102.690,145.168 102.690,149.586 C102.690,154.004 99.108,157.586 94.690,157.586 Z" className="cls-1"></path>
      <path d="M155.066,103.727 L138.066,133.172 C135.856,136.998 130.964,138.309 127.137,136.100 C123.311,133.891 122.000,128.998 124.209,125.172 L141.209,95.727 C143.418,91.901 148.311,90.590 152.137,92.799 C155.964,95.008 157.275,99.901 155.066,103.727 Z" className="cls-1"></path>
      <path d="M138.150,23.624 L155.150,53.069 C157.360,56.895 156.048,61.788 152.222,63.997 C148.396,66.206 143.503,64.895 141.294,61.069 L124.294,31.624 C122.085,27.798 123.396,22.905 127.222,20.696 C131.048,18.487 135.941,19.798 138.150,23.624 Z" className="cls-1"></path>
      <path d="M61.156,-0.000 L95.156,-0.000 C99.574,-0.000 103.156,3.582 103.156,8.000 C103.156,12.418 99.574,16.000 95.156,16.000 L61.156,16.000 C56.738,16.000 53.156,12.418 53.156,8.000 C53.156,3.582 56.738,-0.000 61.156,-0.000 Z" className="cls-1"></path>
      <circle cx="77.984" cy="78.61" r="75.016" className="cls-2"></circle>
    </g>
  </svg>
);

export const CircleTable8Person: React.FC<TableSVGProps> = ({ width = 80.91, height = 80.45, className = "" }) => (
  <svg 
    preserveAspectRatio="xMidYMid" 
    viewBox="0 0 177.906 176.594" 
    style={{ width: `${width}px`, height: `${height}px` }}
    className={className}
  >
    <defs>
      <style>
        {`.cls-1, .cls-2 { fill: #4e4e4e; }
         .cls-1 { opacity: 0.8; fill-rule: evenodd; }`}
      </style>
    </defs>
    <g>
      <path d="M14.460,37.606 L38.501,13.564 C41.625,10.440 46.691,10.440 49.815,13.564 C52.939,16.689 52.939,21.754 49.815,24.878 L25.773,48.920 C22.649,52.044 17.584,52.044 14.460,48.920 C11.335,45.796 11.335,40.730 14.460,37.606 Z" className="cls-1"></path>
      <path d="M-0.001,105.104 L-0.001,71.103 C-0.001,66.685 3.580,63.104 7.999,63.104 C12.417,63.104 15.999,66.685 15.999,71.103 L15.999,105.104 C15.999,109.522 12.417,113.103 7.999,113.103 C3.580,113.103 -0.001,109.522 -0.001,105.104 Z" className="cls-1"></path>
      <path d="M37.546,164.977 L13.504,140.935 C10.380,137.811 10.380,132.746 13.504,129.622 C16.628,126.497 21.694,126.497 24.818,129.622 L48.860,153.663 C51.984,156.787 51.984,161.853 48.860,164.977 C45.735,168.101 40.670,168.101 37.546,164.977 Z" className="cls-1"></path>
      <path d="M106.352,176.598 L72.352,176.598 C67.934,176.598 64.352,173.017 64.352,168.598 C64.352,164.180 67.934,160.598 72.352,160.598 L106.352,160.598 C110.771,160.598 114.352,164.180 114.352,168.598 C114.352,173.017 110.771,176.598 106.352,176.598 Z" className="cls-1"></path>
      <path d="M165.201,139.780 L141.159,163.822 C138.035,166.946 132.969,166.946 129.845,163.822 C126.721,160.697 126.721,155.632 129.845,152.508 L153.887,128.466 C157.011,125.342 162.076,125.342 165.201,128.466 C168.325,131.591 168.325,136.656 165.201,139.780 Z" className="cls-1"></path>
      <path d="M177.894,71.541 L177.894,105.541 C177.894,109.959 174.313,113.541 169.894,113.541 C165.476,113.541 161.894,109.959 161.894,105.541 L161.894,71.541 C161.894,67.123 165.476,63.541 169.894,63.541 C174.313,63.541 177.894,67.123 177.894,71.541 Z" className="cls-1"></path>
      <path d="M140.309,14.418 L164.350,38.460 C167.475,41.584 167.475,46.649 164.350,49.774 C161.226,52.898 156.161,52.898 153.037,49.774 L128.995,25.732 C125.871,22.608 125.871,17.542 128.995,14.418 C132.119,11.294 137.185,11.294 140.309,14.418 Z" className="cls-1"></path>
      <path d="M72.250,-0.000 L106.250,-0.000 C110.668,-0.000 114.250,3.582 114.250,8.000 C114.250,12.418 110.668,16.000 106.250,16.000 L72.250,16.000 C67.832,16.000 64.250,12.418 64.250,8.000 C64.250,3.582 67.832,-0.000 72.250,-0.000 Z" className="cls-1"></path>
      <circle cx="89.422" cy="88.515" r="84.984" className="cls-2"></circle>
    </g>
  </svg>
);

export const SquareTable6Person: React.FC<TableSVGProps> = ({ width = 112.73, height = 52.73, className = "" }) => (
  <svg 
    preserveAspectRatio="xMidYMid" 
    viewBox="0 0 248 116" 
    style={{ width: `${width}px`, height: `${height}px` }}
    className={className}
  >
    <defs>
      <style>
        {`.cls-1, .cls-2 { fill: #4e4e4e; }
         .cls-1 { opacity: 0.8; fill-rule: evenodd; }`}
      </style>
    </defs>
    <g>
      <path d="M29.000,100.000 L63.000,100.000 C67.418,100.000 71.000,103.582 71.000,108.000 C71.000,112.418 67.418,116.000 63.000,116.000 L29.000,116.000 C24.582,116.000 21.000,112.418 21.000,108.000 C21.000,103.582 24.582,100.000 29.000,100.000 Z" className="cls-1"></path>
      <path d="M29.000,-0.000 L63.000,-0.000 C67.418,-0.000 71.000,3.582 71.000,8.000 C71.000,12.418 67.418,16.000 63.000,16.000 L29.000,16.000 C24.582,16.000 21.000,12.418 21.000,8.000 C21.000,3.582 24.582,-0.000 29.000,-0.000 Z" className="cls-1"></path>
      <path d="M107.000,100.000 L141.000,100.000 C145.418,100.000 149.000,103.582 149.000,108.000 C149.000,112.418 145.418,116.000 141.000,116.000 L107.000,116.000 C102.582,116.000 99.000,112.418 99.000,108.000 C99.000,103.582 102.582,100.000 107.000,100.000 Z" className="cls-1"></path>
      <path d="M107.000,-0.000 L141.000,-0.000 C145.418,-0.000 149.000,3.582 149.000,8.000 C149.000,12.418 145.418,16.000 141.000,16.000 L107.000,16.000 C102.582,16.000 99.000,12.418 99.000,8.000 C99.000,3.582 102.582,-0.000 107.000,-0.000 Z" className="cls-1"></path>
      <path d="M185.000,100.000 L219.000,100.000 C223.418,100.000 227.000,103.582 227.000,108.000 C227.000,112.418 223.418,116.000 219.000,116.000 L185.000,116.000 C180.582,116.000 177.000,112.418 177.000,108.000 C177.000,103.582 180.582,100.000 185.000,100.000 Z" className="cls-1"></path>
      <path d="M185.000,-0.000 L219.000,-0.000 C223.418,-0.000 227.000,3.582 227.000,8.000 C227.000,12.418 223.418,16.000 219.000,16.000 L185.000,16.000 C180.582,16.000 177.000,12.418 177.000,8.000 C177.000,3.582 180.582,-0.000 185.000,-0.000 Z" className="cls-1"></path>
      <rect y="8" width="248" height="100" className="cls-2"></rect>
    </g>
  </svg>
);

export const SquareTable8Person: React.FC<TableSVGProps> = ({ width = 148.18, height = 52.73, className = "" }) => (
  <svg 
    preserveAspectRatio="xMidYMid" 
    viewBox="0 0 326 116" 
    style={{ width: `${width}px`, height: `${height}px` }}
    className={className}
  >
    <defs>
      <style>
        {`.cls-1, .cls-2 { fill: #4e4e4e; }
         .cls-1 { opacity: 0.8; fill-rule: evenodd; }`}
      </style>
    </defs>
    <g>
      <path d="M29.000,100.000 L63.000,100.000 C67.418,100.000 71.000,103.582 71.000,108.000 C71.000,112.418 67.418,116.000 63.000,116.000 L29.000,116.000 C24.582,116.000 21.000,112.418 21.000,108.000 C21.000,103.582 24.582,100.000 29.000,100.000 Z" className="cls-1"></path>
      <path d="M29.000,-0.000 L63.000,-0.000 C67.418,-0.000 71.000,3.582 71.000,8.000 C71.000,12.418 67.418,16.000 63.000,16.000 L29.000,16.000 C24.582,16.000 21.000,12.418 21.000,8.000 C21.000,3.582 24.582,-0.000 29.000,-0.000 Z" className="cls-1"></path>
      <path d="M107.000,100.000 L141.000,100.000 C145.418,100.000 149.000,103.582 149.000,108.000 C149.000,112.418 145.418,116.000 141.000,116.000 L107.000,116.000 C102.582,116.000 99.000,112.418 99.000,108.000 C99.000,103.582 102.582,100.000 107.000,100.000 Z" className="cls-1"></path>
      <path d="M107.000,-0.000 L141.000,-0.000 C145.418,-0.000 149.000,3.582 149.000,8.000 C149.000,12.418 145.418,16.000 141.000,16.000 L107.000,16.000 C102.582,16.000 99.000,12.418 99.000,8.000 C99.000,3.582 102.582,-0.000 107.000,-0.000 Z" className="cls-1"></path>
      <path d="M185.000,100.000 L219.000,100.000 C223.418,100.000 227.000,103.582 227.000,108.000 C227.000,112.418 223.418,116.000 219.000,116.000 L185.000,116.000 C180.582,116.000 177.000,112.418 177.000,108.000 C177.000,103.582 180.582,100.000 185.000,100.000 Z" className="cls-1"></path>
      <path d="M185.000,-0.000 L219.000,-0.000 C223.418,-0.000 227.000,3.582 227.000,8.000 C227.000,12.418 223.418,16.000 219.000,16.000 L185.000,16.000 C180.582,16.000 177.000,12.418 177.000,8.000 C177.000,3.582 180.582,-0.000 185.000,-0.000 Z" className="cls-1"></path>
      <path d="M262.000,100.000 L296.000,100.000 C300.418,100.000 304.000,103.582 304.000,108.000 C304.000,112.418 300.418,116.000 296.000,116.000 L262.000,116.000 C257.582,116.000 254.000,112.418 254.000,108.000 C254.000,103.582 257.582,100.000 262.000,100.000 Z" className="cls-1"></path>
      <path d="M263.000,-0.000 L297.000,-0.000 C301.418,-0.000 305.000,3.582 305.000,8.000 C305.000,12.418 301.418,16.000 297.000,16.000 L263.000,16.000 C258.582,16.000 255.000,12.418 255.000,8.000 C255.000,3.582 258.582,-0.000 263.000,-0.000 Z" className="cls-1"></path>
      <rect y="8" width="326" height="100" className="cls-2"></rect>
    </g>
  </svg>
);

// Main wrapper component for table shapes
interface TableShapesSVGProps {
  shape: string;
  capacity: number;
  width?: number;
  height?: number;
  className?: string;
}

export const getTableSVG = (shape: string, capacity: number, width: number = 80, height: number = 80, className: string = "") => {
    // Safety check for capacity and ensure consistent sizing
    const safeCapacity = capacity || 4;
    // ALL TABLES USE THE SAME SIZE - 100x100 for perfect consistency
    const standardWidth = 100;
    const standardHeight = 100;

    // For very high capacities (12+), use the largest available table
    // This handles cases where someone enters 15, 16, or even 20 persons - they all get a 12-person table visual
    // The actual capacity number will still be stored and displayed correctly
    const effectiveCapacity = Math.min(safeCapacity, 12);

    // Force all tables to render at exactly the same size with CSS override
    const forceEqualSizeStyle = {
      width: `${standardWidth}px !important`,
      height: `${standardHeight}px !important`,
      minWidth: `${standardWidth}px`,
      minHeight: `${standardHeight}px`,
      maxWidth: `${standardWidth}px`,
      maxHeight: `${standardHeight}px`,
    };

    switch (shape) {
      case "round":
      case "circle":
        if (effectiveCapacity <= 2) return <div style={forceEqualSizeStyle}><CircleTable2Person width={standardWidth} height={standardHeight} className={className} /></div>;
        if (effectiveCapacity <= 4) return <div style={forceEqualSizeStyle}><CircleTable4Person width={standardWidth} height={standardHeight} className={className} /></div>;
        if (effectiveCapacity <= 6) return <div style={forceEqualSizeStyle}><CircleTable6Person width={standardWidth} height={standardHeight} className={className} /></div>;
        return <div style={forceEqualSizeStyle}><CircleTable8Person width={standardWidth} height={standardHeight} className={className} /></div>;

      case "square":
      case "rectangle":
        if (effectiveCapacity <= 4) return <div style={forceEqualSizeStyle}><SquareTable4Person width={standardWidth} height={standardHeight} className={className} /></div>;
        if (effectiveCapacity <= 6) return <div style={forceEqualSizeStyle}><SquareTable6Person width={standardWidth} height={standardHeight} className={className} /></div>;
        return <div style={forceEqualSizeStyle}><SquareTable8Person width={standardWidth} height={standardHeight} className={className} /></div>;

      case "long-rectangle":
        if (effectiveCapacity <= 4) return <div style={forceEqualSizeStyle}><SquareTable4Person width={standardWidth} height={standardHeight} className={className} /></div>;
        if (effectiveCapacity <= 6) return <div style={forceEqualSizeStyle}><SquareTable6Person width={standardWidth} height={standardHeight} className={className} /></div>;
        return <div style={forceEqualSizeStyle}><SquareTable8Person width={standardWidth} height={standardHeight} className={className} /></div>;

      default:
        // Default to round tables
        if (effectiveCapacity <= 2) return <div style={forceEqualSizeStyle}><CircleTable2Person width={standardWidth} height={standardHeight} className={className} /></div>;
        if (effectiveCapacity <= 4) return <div style={forceEqualSizeStyle}><CircleTable4Person width={standardWidth} height={standardHeight} className={className} /></div>;
        if (effectiveCapacity <= 6) return <div style={forceEqualSizeStyle}><CircleTable6Person width={standardWidth} height={standardHeight} className={className} /></div>;
        return <div style={forceEqualSizeStyle}><CircleTable8Person width={standardWidth} height={standardHeight} className={className} /></div>;
    }
  };

// Legacy export for backward compatibility
export const TableShapesSVG = ({ shape, capacity, width = 60, height = 60, className = "" }: {
  shape: string;
  capacity: number;
  width?: number;
  height?: number;
  className?: string;
}) => {
  return getTableSVG(shape, capacity, width, height, className);
};