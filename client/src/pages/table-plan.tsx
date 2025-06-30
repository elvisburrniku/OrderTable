import React, { useState, useRef, useCallback } from "react";
import { useAuthGuard } from "@/lib/auth.tsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Save,
  RotateCw,
  Move,
  Square,
  Circle,
  Users,
  ExternalLink,
  Book,
  Menu,
} from "lucide-react";
import {
  TABLE_STRUCTURES,
  TableStructurePreview,
  getDraggableTableStructure,
} from "@/components/table-shapes/TableStructures";
import { getTableSVG } from "@/components/table-shapes/TableShapesSVG";

interface TablePosition {
  id: number;
  x: number;
  y: number;
  rotation: number;
  shape:
    | "square"
    | "circle"
    | "rectangle"
    | "oval"
    | "round"
    | "octagon"
    | "hexagon"
    | "long-rectangle"
    | "curved";
  tableNumber?: string;
  capacity?: number;
  isConfigured?: boolean;
  width?: number;
  height?: number;
}

// Enhanced table templates that match EasyTableBooking design
const TABLE_TEMPLATES = [
  {
    id: "square_1p",
    type: "1",
    shape: "square",
    seats: 1,
    canRotate: true,
    label: "Square 1 Person",
    svgViewBox: "0 0 90 116",
    svgContent: `
      <defs>
        <style>
          .cls-2, .cls-3 { fill: #4e4e4e; }
          .cls-2 { fill-rule: evenodd; opacity: 0.8; }
        </style>
      </defs>
      <g>
        <path d="M27.000,-0.000 L61.000,-0.000 C65.418,-0.000 69.000,3.582 69.000,8.000 C69.000,12.418 65.418,16.000 61.000,16.000 L27.000,16.000 C22.582,16.000 19.000,12.418 19.000,8.000 C19.000,3.582 22.582,-0.000 27.000,-0.000 Z" class="cls-2"></path>
        <rect y="8" width="90" height="100" class="cls-3"></rect>
      </g>
    `,
    width: 40.91,
    height: 52.73,
  },
  {
    id: "circle_1p",
    type: "20",
    shape: "circle",
    seats: 1,
    canRotate: true,
    label: "Circle 1 Person",
    svgViewBox: "0 0 96 96",
    svgContent: `
      <defs>
        <style>
          .cls-1, .cls-3 { fill: #4e4e4e; }
          .cls-1 { opacity: 0.8; fill-rule: evenodd; }
        </style>
      </defs>
      <g>
        <path d="M28.000,-0.000 L62.000,-0.000 C66.418,-0.000 70.000,3.582 70.000,8.000 C70.000,12.418 66.418,16.000 62.000,16.000 L28.000,16.000 C23.582,16.000 20.000,12.418 20.000,8.000 C20.000,3.582 23.582,-0.000 28.000,-0.000 Z" transform="translate(3)" class="cls-1"></path>
        <circle cx="48" cy="48" r="45" class="cls-3"></circle>
      </g>
    `,
    width: 43.64,
    height: 43.64,
  },
  {
    id: "square_2p",
    type: "2",
    shape: "square",
    seats: 2,
    canRotate: true,
    label: "Square 2 People",
    svgViewBox: "0 0 90 116",
    svgContent: `
      <defs>
        <style>
          .cls-1, .cls-2 { fill: #4e4e4e; }
          .cls-1 { opacity: 0.8; fill-rule: evenodd; }
        </style>
      </defs>
      <g>
        <path d="M27.000,100.000 L61.000,100.000 C65.418,100.000 69.000,103.582 69.000,108.000 C69.000,112.418 65.418,116.000 61.000,116.000 L27.000,116.000 C22.582,116.000 19.000,112.418 19.000,108.000 C19.000,103.582 22.582,100.000 27.000,100.000 Z" class="cls-1"></path>
        <path d="M27.000,-0.000 L61.000,-0.000 C65.418,-0.000 69.000,3.582 69.000,8.000 C69.000,12.418 65.418,16.000 61.000,16.000 L27.000,16.000 C22.582,16.000 19.000,12.418 19.000,8.000 C19.000,3.582 22.582,-0.000 27.000,-0.000 Z" class="cls-1"></path>
        <rect y="8" width="90" height="100" class="cls-2"></rect>
      </g>
    `,
    width: 40.91,
    height: 52.73,
  },
  {
    id: "circle_2p",
    type: "21",
    shape: "circle",
    seats: 2,
    canRotate: true,
    label: "Circle 2 People",
    svgViewBox: "0 0 96 96",
    svgContent: `
      <defs>
        <style>
          .cls-1, .cls-2 { fill: #4e4e4e; }
          .cls-1 { opacity: 0.8; fill-rule: evenodd; }
        </style>
      </defs>
      <g>
        <path d="M28.000,-0.000 L62.000,-0.000 C66.418,-0.000 70.000,3.582 70.000,8.000 C70.000,12.418 66.418,16.000 62.000,16.000 L28.000,16.000 C23.582,16.000 20.000,12.418 20.000,8.000 C20.000,3.582 23.582,-0.000 28.000,-0.000 Z" transform="translate(3)" class="cls-1"></path>
        <path d="M28.000,80.000 L62.000,80.000 C66.418,80.000 70.000,83.582 70.000,88.000 C70.000,92.418 66.418,96.000 62.000,96.000 L28.000,96.000 C23.582,96.000 20.000,92.418 20.000,88.000 C20.000,83.582 23.582,80.000 28.000,80.000 Z" transform="translate(3)" class="cls-1"></path>
        <circle cx="48" cy="48" r="45" class="cls-2"></circle>
      </g>
    `,
    width: 43.64,
    height: 43.64,
  },
  {
    id: "square_4p",
    type: "3",
    shape: "rectangle",
    seats: 4,
    canRotate: true,
    label: "Rectangle 4 People",
    svgViewBox: "0 0 170 116",
    svgContent: `
      <defs>
        <style>
          .cls-1, .cls-2 { fill: #4e4e4e; }
          .cls-1 { opacity: 0.8; fill-rule: evenodd; }
        </style>
      </defs>
      <g>
        <path d="M29.000,100.000 L63.000,100.000 C67.418,100.000 71.000,103.582 71.000,108.000 C71.000,112.418 67.418,116.000 63.000,116.000 L29.000,116.000 C24.582,116.000 21.000,112.418 21.000,108.000 C21.000,103.582 24.582,100.000 29.000,100.000 Z" class="cls-1"></path>
        <path d="M29.000,-0.000 L63.000,-0.000 C67.418,-0.000 71.000,3.582 71.000,8.000 C71.000,12.418 67.418,16.000 63.000,16.000 L29.000,16.000 C24.582,16.000 21.000,12.418 21.000,8.000 C21.000,3.582 24.582,-0.000 29.000,-0.000 Z" class="cls-1"></path>
        <path d="M107.000,100.000 L141.000,100.000 C145.418,100.000 149.000,103.582 149.000,108.000 C149.000,112.418 145.418,116.000 141.000,116.000 L107.000,116.000 C102.582,116.000 99.000,112.418 99.000,108.000 C99.000,103.582 102.582,100.000 107.000,100.000 Z" class="cls-1"></path>
        <path d="M107.000,-0.000 L141.000,-0.000 C145.418,-0.000 149.000,3.582 149.000,8.000 C149.000,12.418 145.418,16.000 141.000,16.000 L107.000,16.000 C102.582,16.000 99.000,12.418 99.000,8.000 C99.000,3.582 102.582,-0.000 107.000,-0.000 Z" class="cls-1"></path>
        <rect y="8" width="170" height="100" class="cls-2"></rect>
      </g>
    `,
    width: 77.27,
    height: 52.73,
  },
  {
    id: "square_4p_2",
    type: "10",
    shape: "square",
    seats: 4,
    canRotate: true,
    label: "Square 4 People",
    svgViewBox: "0 0 136 136",
    svgContent: `
      <defs>
        <style>
          .cls-1, .cls-2 { fill: #4e4e4e; }
          .cls-1 { opacity: 0.8; fill-rule: evenodd; }
        </style>
      </defs>
      <g>
        <path d="M51.000,120.000 L85.000,120.000 C89.418,120.000 93.000,123.582 93.000,128.000 C93.000,132.418 89.418,136.000 85.000,136.000 L51.000,136.000 C46.582,136.000 43.000,132.418 43.000,128.000 C43.000,123.582 46.582,120.000 51.000,120.000 Z" class="cls-1"></path>
        <path d="M128.000,43.000 C132.418,43.000 136.000,46.582 136.000,51.000 L136.000,85.000 C136.000,89.418 132.418,93.000 128.000,93.000 C123.582,93.000 120.000,89.418 120.000,85.000 L120.000,51.000 C120.000,46.582 123.582,43.000 128.000,43.000 Z" class="cls-1"></path>
        <path d="M8.000,43.000 C12.418,43.000 16.000,46.582 16.000,51.000 L16.000,85.000 C16.000,89.418 12.418,93.000 8.000,93.000 C3.582,93.000 -0.000,89.418 -0.000,85.000 L-0.000,51.000 C-0.000,46.582 3.582,43.000 8.000,43.000 Z" class="cls-1"></path>
        <path d="M51.000,-0.000 L85.000,-0.000 C89.418,-0.000 93.000,3.582 93.000,8.000 C93.000,12.418 89.418,16.000 85.000,16.000 L51.000,16.000 C46.582,16.000 43.000,12.418 43.000,8.000 C43.000,3.582 46.582,-0.000 51.000,-0.000 Z" class="cls-1"></path>
        <rect x="8" y="8" width="120" height="120" class="cls-2"></rect>
      </g>
    `,
    width: 61.82,
    height: 61.82,
  },
  {
    id: "circle_4p",
    type: "23",
    shape: "circle",
    seats: 4,
    canRotate: false,
    label: "Circle 4 People",
    svgViewBox: "0 0 116 116",
    svgContent: `
      <defs>
        <style>
          .cls-1, .cls-2 { fill: #4e4e4e; }
          .cls-1 { opacity: 0.8; fill-rule: evenodd; }
        </style>
      </defs>
      <g>
        <path d="M41.000,-0.000 L75.000,-0.000 C79.418,-0.000 83.000,3.582 83.000,8.000 C83.000,12.418 79.418,16.000 75.000,16.000 L41.000,16.000 C36.582,16.000 33.000,12.418 33.000,8.000 C33.000,3.582 36.582,-0.000 41.000,-0.000 Z" class="cls-1"></path>
        <path d="M41.000,100.000 L75.000,100.000 C79.418,100.000 83.000,103.582 83.000,108.000 C83.000,112.418 79.418,116.000 75.000,116.000 L41.000,116.000 C36.582,116.000 33.000,112.418 33.000,108.000 C33.000,103.582 36.582,100.000 41.000,100.000 Z" class="cls-1"></path>
        <path d="M108.000,33.000 C112.418,33.000 116.000,36.582 116.000,41.000 L116.000,75.000 C116.000,79.418 112.418,83.000 108.000,83.000 C103.582,83.000 100.000,79.418 100.000,75.000 L100.000,41.000 C100.000,36.582 103.582,33.000 108.000,33.000 Z" class="cls-1"></path>
        <path d="M8.000,33.000 C12.418,33.000 16.000,36.582 16.000,41.000 L16.000,75.000 C16.000,79.418 12.418,83.000 8.000,83.000 C3.582,83.000 -0.000,79.418 -0.000,75.000 L-0.000,41.000 C-0.000,36.582 3.582,33.000 8.000,33.000 Z" class="cls-1"></path>
        <circle cx="58" cy="58" r="55" class="cls-2"></circle>
      </g>
    `,
    width: 52.73,
    height: 52.73,
  },
  {
    id: "circle_6p",
    type: "25",
    shape: "circle",
    seats: 6,
    canRotate: false,
    label: "Circle 6 People",
    svgViewBox: "0 0 156.219 157.594",
    svgContent: `
      <defs>
        <style>
          .cls-1, .cls-2 { fill: #4e4e4e; }
          .cls-1 { opacity: 0.8; fill-rule: evenodd; }
        </style>
      </defs>
      <g>
        <path d="M1.064,53.842 L18.064,24.397 C20.273,20.571 25.166,19.260 28.992,21.469 C32.818,23.678 34.129,28.571 31.920,32.397 L14.920,61.842 C12.711,65.668 7.818,66.979 3.992,64.770 C0.166,62.561 -1.145,57.668 1.064,53.842 Z" class="cls-1"></path>
        <path d="M18.064,133.574 L1.064,104.129 C-1.145,100.303 0.166,95.410 3.992,93.201 C7.818,90.992 12.711,92.303 14.920,96.129 L31.920,125.574 C34.129,129.400 32.818,134.293 28.992,136.502 C25.166,138.711 20.273,137.400 18.064,133.574 Z" class="cls-1"></path>
        <path d="M94.690,157.586 L60.690,157.586 C56.272,157.586 52.690,154.004 52.690,149.586 C52.690,145.168 56.272,141.586 60.690,141.586 L94.690,141.586 C99.108,141.586 102.690,145.168 102.690,149.586 C102.690,154.004 99.108,157.586 94.690,157.586 Z" class="cls-1"></path>
        <path d="M155.066,103.727 L138.066,133.172 C135.856,136.998 130.964,138.309 127.137,136.100 C123.311,133.891 122.000,128.998 124.209,125.172 L141.209,95.727 C143.418,91.901 148.311,90.590 152.137,92.799 C155.964,95.008 157.275,99.901 155.066,103.727 Z" class="cls-1"></path>
        <path d="M138.150,23.624 L155.150,53.069 C157.360,56.895 156.048,61.788 152.222,63.997 C148.396,66.206 143.503,64.895 141.294,61.069 L124.294,31.624 C122.085,27.798 123.396,22.905 127.222,20.696 C131.048,18.487 135.941,19.798 138.150,23.624 Z" class="cls-1"></path>
        <path d="M61.156,-0.000 L95.156,-0.000 C99.574,-0.000 103.156,3.582 103.156,8.000 C103.156,12.418 99.574,16.000 95.156,16.000 L61.156,16.000 C56.738,16.000 53.156,12.418 53.156,8.000 C53.156,3.582 56.738,-0.000 61.156,-0.000 Z" class="cls-1"></path>
        <circle cx="77.984" cy="78.61" r="75.016" class="cls-2"></circle>
      </g>
    `,
    width: 70.91,
    height: 71.82,
  },
  {
    id: "square_6p",
    type: "4",
    shape: "rectangle",
    seats: 6,
    canRotate: true,
    label: "Rectangle 6 People",
    svgViewBox: "0 0 248 116",
    svgContent: `
      <defs>
        <style>
          .cls-1, .cls-2 { fill: #4e4e4e; }
          .cls-1 { opacity: 0.8; fill-rule: evenodd; }
        </style>
      </defs>
      <g>
        <path d="M29.000,100.000 L63.000,100.000 C67.418,100.000 71.000,103.582 71.000,108.000 C71.000,112.418 67.418,116.000 63.000,116.000 L29.000,116.000 C24.582,116.000 21.000,112.418 21.000,108.000 C21.000,103.582 24.582,100.000 29.000,100.000 Z" class="cls-1"></path>
        <path d="M29.000,-0.000 L63.000,-0.000 C67.418,-0.000 71.000,3.582 71.000,8.000 C71.000,12.418 67.418,16.000 63.000,16.000 L29.000,16.000 C24.582,16.000 21.000,12.418 21.000,8.000 C21.000,3.582 24.582,-0.000 29.000,-0.000 Z" class="cls-1"></path>
        <path d="M107.000,100.000 L141.000,100.000 C145.418,100.000 149.000,103.582 149.000,108.000 C149.000,112.418 145.418,116.000 141.000,116.000 L107.000,116.000 C102.582,116.000 99.000,112.418 99.000,108.000 C99.000,103.582 102.582,100.000 107.000,100.000 Z" class="cls-1"></path>
        <path d="M107.000,-0.000 L141.000,-0.000 C145.418,-0.000 149.000,3.582 149.000,8.000 C149.000,12.418 145.418,16.000 141.000,16.000 L107.000,16.000 C102.582,16.000 99.000,12.418 99.000,8.000 C99.000,3.582 102.582,-0.000 107.000,-0.000 Z" class="cls-1"></path>
        <path d="M185.000,100.000 L219.000,100.000 C223.418,100.000 227.000,103.582 227.000,108.000 C227.000,112.418 223.418,116.000 219.000,116.000 L185.000,116.000 C180.582,116.000 177.000,112.418 177.000,108.000 C177.000,103.582 180.582,100.000 185.000,100.000 Z" class="cls-1"></path>
        <path d="M185.000,-0.000 L219.000,-0.000 C223.418,-0.000 227.000,3.582 227.000,8.000 C227.000,12.418 223.418,16.000 219.000,16.000 L185.000,16.000 C180.582,16.000 177.000,12.418 177.000,8.000 C177.000,3.582 180.582,-0.000 185.000,-0.000 Z" class="cls-1"></path>
        <rect y="8" width="248" height="100" class="cls-2"></rect>
      </g>
    `,
    width: 112.73,
    height: 52.73,
  },
  {
    id: "square_8p",
    type: "5",
    shape: "rectangle",
    seats: 8,
    canRotate: true,
    label: "Rectangle 8 People",
    svgViewBox: "0 0 326 116",
    svgContent: `
      <defs>
        <style>
          .cls-1, .cls-2 { fill: #4e4e4e; }
          .cls-1 { opacity: 0.8; fill-rule: evenodd; }
        </style>
      </defs>
      <g>
        <path d="M29.000,100.000 L63.000,100.000 C67.418,100.000 71.000,103.582 71.000,108.000 C71.000,112.418 67.418,116.000 63.000,116.000 L29.000,116.000 C24.582,116.000 21.000,112.418 21.000,108.000 C21.000,103.582 24.582,100.000 29.000,100.000 Z" class="cls-1"></path>
        <path d="M29.000,-0.000 L63.000,-0.000 C67.418,-0.000 71.000,3.582 71.000,8.000 C71.000,12.418 67.418,16.000 63.000,16.000 L29.000,16.000 C24.582,16.000 21.000,12.418 21.000,8.000 C21.000,3.582 24.582,-0.000 29.000,-0.000 Z" class="cls-1"></path>
        <path d="M107.000,100.000 L141.000,100.000 C145.418,100.000 149.000,103.582 149.000,108.000 C149.000,112.418 145.418,116.000 141.000,116.000 L107.000,116.000 C102.582,116.000 99.000,112.418 99.000,108.000 C99.000,103.582 102.582,100.000 107.000,100.000 Z" class="cls-1"></path>
        <path d="M107.000,-0.000 L141.000,-0.000 C145.418,-0.000 149.000,3.582 149.000,8.000 C149.000,12.418 145.418,16.000 141.000,16.000 L107.000,16.000 C102.582,16.000 99.000,12.418 99.000,8.000 C99.000,3.582 102.582,-0.000 107.000,-0.000 Z" class="cls-1"></path>
        <path d="M185.000,100.000 L219.000,100.000 C223.418,100.000 227.000,103.582 227.000,108.000 C227.000,112.418 223.418,116.000 219.000,116.000 L185.000,116.000 C180.582,116.000 177.000,112.418 177.000,108.000 C177.000,103.582 180.582,100.000 185.000,100.000 Z" class="cls-1"></path>
        <path d="M185.000,-0.000 L219.000,-0.000 C223.418,-0.000 227.000,3.582 227.000,8.000 C227.000,12.418 223.418,16.000 219.000,16.000 L185.000,16.000 C180.582,16.000 177.000,12.418 177.000,8.000 C177.000,3.582 180.582,-0.000 185.000,-0.000 Z" class="cls-1"></path>
        <path d="M263.000,100.000 L297.000,100.000 C301.418,100.000 305.000,103.582 305.000,108.000 C305.000,112.418 301.418,116.000 297.000,116.000 L263.000,116.000 C258.582,116.000 255.000,112.418 255.000,108.000 C255.000,103.582 258.582,100.000 263.000,100.000 Z" class="cls-1"></path>
        <path d="M263.000,-0.000 L297.000,-0.000 C301.418,-0.000 305.000,3.582 305.000,8.000 C305.000,12.418 301.418,16.000 297.000,16.000 L263.000,16.000 C258.582,16.000 255.000,12.418 255.000,8.000 C255.000,3.582 258.582,-0.000 263.000,-0.000 Z" class="cls-1"></path>
        <rect y="8" width="326" height="100" class="cls-2"></rect>
      </g>
    `,
    width: 148.18,
    height: 52.73,
  },
];

const TABLE_SHAPES = [
  { value: "square", label: "Square" },
  { value: "circle", label: "Circle" },
  { value: "rectangle", label: "Rectangle" },
];

export default function TablePlan() {
  const {
    isLoading: authLoading,
    isAuthenticated,
    user,
    restaurant,
  } = useAuthGuard();
  const queryClient = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [tablePositions, setTablePositions] = useState<
    Record<number, TablePosition>
  >({});
  const [draggedTable, setDraggedTable] = useState<number | null>(null);
  const [draggedStructure, setDraggedStructure] =
    useState<any | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [pendingTablePosition, setPendingTablePosition] = useState<{
    x: number;
    y: number;
    structure: any;
  } | null>(null);
  const [tableConfig, setTableConfig] = useState({
    tableNumber: "",
    capacity: 2,
  });
  const [selectedTableForConfig, setSelectedTableForConfig] = useState<number | null>(null);
  const [showTableConfigPopup, setShowTableConfigPopup] = useState(false);
  const planRef = useRef<HTMLDivElement>(null);

  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: [
      "/api/tenants",
      restaurant?.tenantId,
      "restaurants",
      restaurant?.id,
      "tables",
    ],
    queryFn: async () => {
      const tenantId = restaurant?.tenantId;
      const response = await fetch(
        `/api/tenants/${tenantId}/restaurants/${restaurant?.id}/tables`,
      );
      if (!response.ok) throw new Error("Failed to fetch tables");
      return response.json();
    },
    enabled: !!restaurant && !!restaurant.tenantId,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: [
      "/api/tenants",
      restaurant?.tenantId,
      "restaurants",
      restaurant?.id,
      "rooms",
    ],
    queryFn: async () => {
      const tenantId = restaurant?.tenantId;
      const response = await fetch(
        `/api/tenants/${tenantId}/restaurants/${restaurant?.id}/rooms`,
      );
      if (!response.ok) throw new Error("Failed to fetch rooms");
      return response.json();
    },
    enabled: !!restaurant && !!restaurant.tenantId,
  });

  // Load saved table layout
  const { data: savedLayout } = useQuery({
    queryKey: [
      "/api/tenants",
      restaurant?.tenantId,
      "restaurants",
      restaurant?.id,
      "table-layout",
      selectedRoom,
    ],
    queryFn: async () => {
      const tenantId = restaurant?.tenantId;
      const response = await fetch(
        `/api/tenants/${tenantId}/restaurants/${restaurant?.id}/table-layout?room=${selectedRoom}`,
      );
      if (!response.ok) throw new Error("Failed to fetch table layout");
      return response.json();
    },
    enabled: !!restaurant && !!restaurant.tenantId,
  });

  // Auto-select first room when rooms load
  React.useEffect(() => {
    if (rooms.length > 0 && !selectedRoom) {
      setSelectedRoom(rooms[0].id.toString());
    }
  }, [rooms, selectedRoom]);

  // Apply saved layout when it loads
  React.useEffect(() => {
    if (savedLayout?.positions) {
      setTablePositions(savedLayout.positions);
    }
  }, [savedLayout]);

  const saveLayoutMutation = useMutation({
    mutationFn: async (positions: Record<number, TablePosition>) => {
      const tenantId = restaurant?.tenantId;
      const response = await fetch(
        `/api/tenants/${tenantId}/restaurants/${restaurant?.id}/table-layout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: selectedRoom, positions }),
        },
      );
      if (!response.ok) throw new Error("Failed to save layout");
      return response.json();
    },
    onSuccess: () => {
      alert("Table layout saved successfully!");
    },
  });

  const handleDragStart = useCallback((tableId: number, e: React.DragEvent) => {
    setDraggedTable(tableId);
    setDraggedStructure(null);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleStructureDragStart = useCallback(
    (structure: any, e: React.DragEvent) => {
      console.log("Starting drag for structure:", structure);
      setDraggedStructure(structure);
      setDraggedTable(null);
      setIsDragging(true);
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData("text/plain", structure.id);
    },
    [],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (draggedStructure) {
        e.dataTransfer.dropEffect = "copy";
      } else if (draggedTable !== null) {
        e.dataTransfer.dropEffect = "move";
      } else {
        e.dataTransfer.dropEffect = "none";
      }
    },
    [draggedStructure, draggedTable],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      console.log("Drop event fired", { draggedTable, draggedStructure });

      if (!planRef.current) {
        console.log("No plan ref");
        return;
      }

      const rect = planRef.current.getBoundingClientRect();
      
      // Calculate exact drop position - center table at cursor position
      const tableHalfSize = 25; // Half of 50px table size
      const x = Math.max(
        tableHalfSize,
        Math.min(e.clientX - rect.left, rect.width - tableHalfSize),
      );
      const y = Math.max(
        tableHalfSize,
        Math.min(e.clientY - rect.top, rect.height - tableHalfSize),
      );

      console.log("Drop position:", { x, y });
      console.log("Current table positions before drop:", tablePositions);

      if (draggedTable !== null) {
        console.log("Moving existing table:", draggedTable, "to position:", { x, y });
        // Moving existing table - use table ID directly as the key
        setTablePositions((prev) => {
          const updated = {
            ...prev,
            [draggedTable]: {
              ...prev[draggedTable],
              x,
              y,
            },
          };
          console.log("Updated table positions:", updated);
          return updated;
        });
        setDraggedTable(null);
        setDraggedStructure(null);
        setIsDragging(false);
      } else if (draggedStructure) {
        console.log("Adding new table from structure:", draggedStructure);
        // Adding new table from structure - store position and structure info
        const currentStructure = draggedStructure;

        // Reset drag states first
        setDraggedTable(null);
        setDraggedStructure(null);
        setIsDragging(false);

        // Then set up the dialog
        console.log("Setting up dialog with structure:", currentStructure);
        setPendingTablePosition({ x, y, structure: currentStructure });
        setTableConfig({
          tableNumber: "",
          capacity: currentStructure.seats || 4,
        });

        // Force show dialog with a small delay to ensure state is updated
        setTimeout(() => {
          console.log("Showing config dialog");
          setShowConfigDialog(true);
        }, 100);
      } else {
        console.log("No dragged item found");
        setDraggedTable(null);
        setDraggedStructure(null);
        setIsDragging(false);
      }
    },
    [draggedTable, draggedStructure],
  );

  const rotateTable = (tableId: number) => {
    setTablePositions((prev) => ({
      ...prev,
      [tableId]: {
        ...prev[tableId],
        rotation: (prev[tableId]?.rotation || 0) + 45,
      },
    }));
  };

  const changeTableShape = (
    tableId: number,
    shape: "square" | "circle" | "rectangle",
  ) => {
    setTablePositions((prev) => ({
      ...prev,
      [tableId]: {
        ...prev[tableId],
        shape,
      },
    }));
  };

  const createTableMutation = useMutation({
    mutationFn: async (tableData: any) => {
      const tenantId = restaurant?.tenantId;
      const response = await fetch(
        `/api/tenants/${tenantId}/restaurants/${restaurant?.id}/tables`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...tableData, restaurantId: restaurant?.id }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData?.requiresUpgrade) {
          throw new Error(`Table Limit Exceeded: ${errorData.message}`);
        }
        throw new Error(errorData?.message || "Failed to create table");
      }
      return response.json();
    },
    onSuccess: (newTable) => {
      // Add the new table to the layout at the pending position
      if (pendingTablePosition) {
        setTablePositions((prev) => ({
          ...prev,
          [newTable.id]: {
            id: newTable.id,
            x: pendingTablePosition.x,
            y: pendingTablePosition.y,
            rotation: 0,
            shape: pendingTablePosition.structure.shape,
            tableNumber: newTable.tableNumber,
            capacity: newTable.capacity,
            isConfigured: true,
          },
        }));
      }

      // Refresh tables list
      queryClient.invalidateQueries({
        queryKey: [
          "/api/tenants",
          restaurant?.tenantId,
          "restaurants",
          restaurant?.id,
          "tables",
        ],
      });

      setShowConfigDialog(false);
      setPendingTablePosition(null);
      setTableConfig({ tableNumber: "", capacity: 2 });
    },
  });

  const handleConfigSubmit = () => {
    if (!pendingTablePosition || !tableConfig.tableNumber.trim()) {
      alert("Please enter a table number");
      return;
    }

    // Check if table number already exists
    const existingTable = tables.find(
      (table: any) => table.tableNumber === tableConfig.tableNumber,
    );
    if (existingTable) {
      alert(
        "A table with this number already exists. Please choose a different number.",
      );
      return;
    }

    // Create the table in the database
    createTableMutation.mutate({
      tableNumber: tableConfig.tableNumber,
      capacity: tableConfig.capacity,
      isActive: true,
    });
  };

  const handleConfigCancel = () => {
    setShowConfigDialog(false);
    setPendingTablePosition(null);
    setTableConfig({ tableNumber: "", capacity: 2 });
  };

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated || !user || !restaurant) {
    return null;
  }

  // Professional SVG table rendering component
  const SVGTableRenderer = ({
    position,
    tableId,
    table,
  }: {
    position: TablePosition;
    tableId: number;
    table: any;
  }) => {
    const capacity = position.capacity || table?.capacity || 4;
    const tableNumber = position.tableNumber || table?.tableNumber || tableId;
    const shape = position.shape || "square";

    // Standardized table size for consistency - ALL TABLES SAME SIZE
    const tableWidth = 50;
    const tableHeight = 50;

    return (
      <div
        style={{
          position: "absolute",
          left: `${position.x - tableWidth / 2}px`,
          top: `${position.y - tableHeight / 2}px`,
          transform: `rotate(${position.rotation || 0}deg)`,
          transformOrigin: "center",
          cursor: isDragging ? "grabbing" : "grab",
          zIndex: draggedTable === tableId ? 1000 : 10,
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          width: `${tableWidth}px`,
          height: `${tableHeight}px`,
        }}
        draggable
        onDragStart={(e) => {
          console.log("Starting drag for table:", tableId);
          setDraggedTable(tableId);
          setDraggedStructure(null);
          setIsDragging(true);
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", tableId.toString());
        }}
        onDragEnd={(e) => {
          console.log("Drag ended for table:", tableId);
          // Don't reset draggedTable immediately - let handleDrop process it first
          // The handleDrop function will reset these states
          setTimeout(() => {
            if (draggedTable === tableId) {
              setDraggedTable(null);
              setIsDragging(false);
            }
          }, 50);
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isDragging) {
            setSelectedTableForConfig(tableId);
            setShowTableConfigPopup(true);
          }
        }}
        className="group"
      >
        {/* SVG Table with professional design - standardized size */}
        <div className="relative w-full h-full">
          {getTableSVG(
            shape,
            capacity,
            tableWidth,
            tableHeight,
            "drop-shadow-lg hover:drop-shadow-xl transition-all w-full h-full",
          )}

          {/* Table number overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold pointer-events-none z-15"
            style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
          >
            <div className="text-center">
              <div>{tableNumber}</div>
              <div className="text-[10px] opacity-90">{capacity} pers.</div>
            </div>
          </div>

          {/* Remove button - always visible on hover */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("Removing table:", tableId);
              if (
                window.confirm(
                  `Remove Table ${tableNumber} from the floor plan?`,
                )
              ) {
                setTablePositions((prev) => {
                  const newPositions = { ...prev };
                  delete newPositions[tableId];
                  return newPositions;
                });
              }
            }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center z-20 hover:scale-110 shadow-lg"
            title="Remove table from plan"
          >
            ×
          </button>
        </div>
      </div>
    );
  };

  // Table styling based on shape
  const getTableStyle = (table: any) => {
    const baseStyle = {
      cursor: "grab",
    };
    return baseStyle;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header matching EasyTableBooking design */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
              <span>Table plan</span>
              <Menu className="ml-2 h-5 w-5 text-gray-500" />
            </h1>
            <div className="flex items-center text-sm text-blue-600">
              <Book className="h-4 w-4 mr-1" />
              <span className="mr-1">Guide</span>
              <a 
                href="https://help.easytablebooking.com/knowledge-base/designing-a-visual-table-plan/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:underline flex items-center"
              >
                Designing a visual table plan
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
          </div>
          <Button 
            onClick={() => saveLayoutMutation.mutate(tablePositions)}
            disabled={saveLayoutMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Layout
          </Button>
        </div>
      </div>

      {/* Main layout matching EasyTableBooking structure */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left sidebar with room selection and table templates */}
        <div className="w-64 bg-gray-50 border-r overflow-y-auto">
          {/* Room Selection Box */}
          <div className="bg-white m-4 p-4 rounded border shadow-sm">
            <div className="font-semibold text-gray-900 mb-3">Room</div>
            <Select value={selectedRoom} onValueChange={setSelectedRoom}>
              <SelectTrigger className="bg-gray-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room: any) => (
                  <SelectItem
                    key={`room-${room.id}`}
                    value={room.id.toString()}
                  >
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-blue-600 mt-2">
              <a href="#">Manage rooms</a>
            </p>
          </div>

          {/* Add Table Templates Box */}
          <div className="bg-white m-4 p-4 rounded border shadow-sm">
            <div className="font-semibold text-gray-900 mb-3">
              Add table <span className="font-normal text-gray-600">(drag to the white box)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TABLE_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className="table new cursor-grab hover:bg-gray-50 p-1 border border-gray-200 rounded transition-colors"
                  draggable
                  onDragStart={(e) => handleStructureDragStart(template, e)}
                  title={`${template.label} - ${template.seats} seats`}
                >
                  <svg 
                    preserveAspectRatio="xMidYMid" 
                    viewBox={template.svgViewBox}
                    style={{ 
                      width: `${Math.min(template.width * 0.5, 40)}px`, 
                      height: `${Math.min(template.height * 0.5, 40)}px`,
                      margin: '0 auto',
                      display: 'block'
                    }}
                    dangerouslySetInnerHTML={{
                      __html: template.svgContent
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main table plan area */}
        <div className="flex-1 bg-white">
          <div
            ref={planRef}
            className="relative h-full min-h-[600px] bg-white border-l"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {/* Grid background */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: "radial-gradient(circle, #999 1px, transparent 1px)",
                backgroundSize: "25px 25px",
              }}
            />

            {/* Drop zone hint */}
            {Object.keys(tablePositions).length === 0 && !isDragging && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Move className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-xl font-medium mb-2">
                    Drag tables here to create your floor plan
                  </p>
                  <p className="text-sm">
                    Start by dragging table shapes from the left sidebar
                  </p>
                </div>
              </div>
            )}

            {/* Active drop zone indicator */}
            {isDragging && draggedStructure && (
              <div className="absolute inset-0 flex items-center justify-center bg-blue-50 bg-opacity-75 border-2 border-dashed border-blue-300">
                <div className="text-center text-blue-600">
                  <Plus className="h-20 w-20 mx-auto mb-4" />
                  <p className="text-xl font-medium">
                    Drop here to add {draggedStructure.label}
                  </p>
                  <p className="text-sm">
                    Configuration dialog will appear after drop
                  </p>
                </div>
              </div>
            )}

            {/* Render placed tables */}
            {Object.entries(tablePositions).map(([tableId, position]) => {
              const dbTable = tables.find((t: any) => t.id === parseInt(tableId));
              const numericTableId = parseInt(tableId);

              return (
                <SVGTableRenderer
                  key={`table-renderer-${tableId}`}
                  position={position}
                  tableId={numericTableId}
                  table={dbTable}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Table Configuration Dialog */}

      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure New Table</DialogTitle>
            <p className="text-sm text-gray-600">
              {pendingTablePosition?.structure &&
                `Adding ${pendingTablePosition.structure.name} (${pendingTablePosition.structure.description})`}
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tableNumber">Table Number *</Label>
              <Input
                id="tableNumber"
                value={tableConfig.tableNumber}
                onChange={(e) =>
                  setTableConfig((prev) => ({
                    ...prev,
                    tableNumber: e.target.value,
                  }))
                }
                placeholder="e.g., 1, A1, VIP-1"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter a unique identifier for this table
              </p>
            </div>
            <div>
              <Label htmlFor="capacity">Seating Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                max="20"
                value={tableConfig.capacity}
                onChange={(e) => {
                  const inputCapacity = parseInt(e.target.value) || 1;
                  setTableConfig((prev) => ({
                    ...prev,
                    capacity: inputCapacity,
                  }));
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum number of guests this table can accommodate
                {tableConfig.capacity > 12 && (
                  <span className="text-blue-600 font-medium block">
                    ℹ️ Tables with {tableConfig.capacity}+ guests will display
                    as 12-person table visual (largest available design)
                  </span>
                )}
                {tableConfig.capacity > 16 && (
                  <span className="text-orange-600 font-medium block">
                    ⚠️ For {tableConfig.capacity} guests, consider using
                    multiple tables for better service and guest experience
                  </span>
                )}
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleConfigCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleConfigSubmit}
                className="bg-green-600 hover:bg-green-700"
                disabled={
                  createTableMutation.isPending ||
                  !tableConfig.tableNumber.trim()
                }
              >
                {createTableMutation.isPending ? "Creating..." : "Add Table"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table Configuration Popup */}
      <Dialog open={showTableConfigPopup} onOpenChange={setShowTableConfigPopup}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure Table</DialogTitle>
            {selectedTableForConfig && (
              <p className="text-sm text-gray-600">
                Table {tablePositions[selectedTableForConfig]?.tableNumber || 
                       tables.find((t: any) => t.id === selectedTableForConfig)?.tableNumber || 
                       selectedTableForConfig} - {tablePositions[selectedTableForConfig]?.capacity || 
                       tables.find((t: any) => t.id === selectedTableForConfig)?.capacity || 4} persons
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            {selectedTableForConfig && (
              <>
                {/* Seating Capacity */}
                <div>
                  <Label htmlFor="seatingCapacity">Seating Capacity</Label>
                  <Input
                    id="seatingCapacity"
                    type="number"
                    min="1"
                    max="20"
                    value={tablePositions[selectedTableForConfig]?.capacity || 
                           tables.find((t: any) => t.id === selectedTableForConfig)?.capacity || 4}
                    onChange={(e) => {
                      const capacity = parseInt(e.target.value) || 4;
                      setTablePositions((prev) => ({
                        ...prev,
                        [selectedTableForConfig]: {
                          ...prev[selectedTableForConfig],
                          capacity: capacity,
                        },
                      }));
                    }}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Number of guests this table can accommodate
                  </p>
                </div>

                {/* Table Size Controls */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tableWidth">Table Width (px)</Label>
                    <Input
                      id="tableWidth"
                      type="number"
                      min="40"
                      max="160"
                      value={tablePositions[selectedTableForConfig]?.width || 70}
                      onChange={(e) => {
                        const width = parseInt(e.target.value) || 70;
                        setTablePositions((prev) => ({
                          ...prev,
                          [selectedTableForConfig]: {
                            ...prev[selectedTableForConfig],
                            width: width,
                          },
                        }));
                      }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tableHeight">Table Height (px)</Label>
                    <Input
                      id="tableHeight"
                      type="number"
                      min="40"
                      max="100"
                      value={tablePositions[selectedTableForConfig]?.height || 70}
                      onChange={(e) => {
                        const height = parseInt(e.target.value) || 70;
                        setTablePositions((prev) => ({
                          ...prev,
                          [selectedTableForConfig]: {
                            ...prev[selectedTableForConfig],
                            height: height,
                          },
                        }));
                      }}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Shape Selection */}
                <div>
                  <Label htmlFor="tableShape">Table Shape</Label>
                  <Select
                    value={tablePositions[selectedTableForConfig]?.shape || "circle"}
                    onValueChange={(shape: "square" | "circle" | "rectangle") => 
                      changeTableShape(selectedTableForConfig, shape)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="circle">
                        <div className="flex items-center gap-2">
                          <Circle className="h-4 w-4" />
                          Circle
                        </div>
                      </SelectItem>
                      <SelectItem value="square">
                        <div className="flex items-center gap-2">
                          <Square className="h-4 w-4" />
                          Square
                        </div>
                      </SelectItem>
                      <SelectItem value="rectangle">
                        <div className="flex items-center gap-2">
                          <Square className="h-4 w-4" />
                          Rectangle
                        </div>
                      </SelectItem>
                      <SelectItem value="long-rectangle">
                        <div className="flex items-center gap-2">
                          <Square className="h-4 w-4" />
                          Long Rectangle
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Rotation Control */}
                <div>
                  <Label>Table Rotation</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      variant="outline"
                      onClick={() => rotateTable(selectedTableForConfig)}
                      className="flex items-center gap-2"
                    >
                      <RotateCw className="h-4 w-4" />
                      Rotate 45°
                    </Button>
                    <span className="text-sm text-gray-500">
                      Current: {tablePositions[selectedTableForConfig]?.rotation || 0}°
                    </span>
                  </div>
                </div>

                {/* Table Preview */}
                <div>
                  <Label>Preview</Label>
                  <div className="mt-2 p-4 border rounded-lg bg-gray-50 flex items-center justify-center">
                    {getTableSVG(
                      tablePositions[selectedTableForConfig]?.shape || "circle",
                      tablePositions[selectedTableForConfig]?.capacity || 
                      tables.find((t: any) => t.id === selectedTableForConfig)?.capacity || 4,
                      tablePositions[selectedTableForConfig]?.width || 80,
                      tablePositions[selectedTableForConfig]?.height || 80,
                      "drop-shadow-lg"
                    )}
                  </div>
                </div>
              </>
            )}
            
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowTableConfigPopup(false);
                  setSelectedTableForConfig(null);
                }}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowTableConfigPopup(false);
                  setSelectedTableForConfig(null);
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
