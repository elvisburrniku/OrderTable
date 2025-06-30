import React from 'react';
import { 
  SquareTable1Person, 
  CircleTable1Person, 
  SquareTable2Person, 
  CircleTable2Person, 
  CircleTable3Person, 
  SquareTable4Person, 
  SquareTable4PersonCompact, 
  CircleTable4Person, 
  CircleTable5Person, 
  CircleTable6Person, 
  CircleTable8Person, 
  SquareTable6Person, 
  SquareTable8Person 
} from './TableShapesSVG';

interface TableStructure {
  id: string;
  name: string;
  shape: "square" | "circle" | "rectangle" | "oval" | "round" | "octagon" | "hexagon" | "long-rectangle" | "curved";
  component: React.FC<{ width?: number; height?: number; className?: string }>;
  defaultCapacity: number;
  description: string;
  width: number;
  height: number;
}

export const TABLE_STRUCTURES: TableStructure[] = [
  {
    id: "square-1",
    name: "Square 1",
    shape: "square",
    component: SquareTable1Person,
    defaultCapacity: 1,
    description: "1-person square table",
    width: 40.91,
    height: 52.73,
  },
  {
    id: "circle-1",
    name: "Round 1",
    shape: "circle",
    component: CircleTable1Person,
    defaultCapacity: 1,
    description: "1-person round table",
    width: 43.64,
    height: 43.64,
  },
  {
    id: "square-2",
    name: "Square 2",
    shape: "square",
    component: SquareTable2Person,
    defaultCapacity: 2,
    description: "2-person square table",
    width: 40.91,
    height: 52.73,
  },
  {
    id: "circle-2",
    name: "Round 2",
    shape: "circle",
    component: CircleTable2Person,
    defaultCapacity: 2,
    description: "2-person round table",
    width: 43.64,
    height: 43.64,
  },
  {
    id: "circle-3",
    name: "Round 3",
    shape: "round",
    component: CircleTable3Person,
    defaultCapacity: 3,
    description: "3-person round table",
    width: 50,
    height: 46.82,
  },
  {
    id: "square-4",
    name: "Square 4",
    shape: "square",
    component: SquareTable4Person,
    defaultCapacity: 4,
    description: "4-person square table",
    width: 77.27,
    height: 52.73,
  },
  {
    id: "square-4-compact",
    name: "Square 4 Compact",
    shape: "square",
    component: SquareTable4PersonCompact,
    defaultCapacity: 4,
    description: "4-person compact square table",
    width: 61.82,
    height: 61.82,
  },
  {
    id: "circle-4",
    name: "Round 4",
    shape: "round",
    component: CircleTable4Person,
    defaultCapacity: 4,
    description: "4-person round table",
    width: 52.73,
    height: 52.73,
  },
  {
    id: "circle-5",
    name: "Round 5",
    shape: "round",
    component: CircleTable5Person,
    defaultCapacity: 5,
    description: "5-person round table",
    width: 63.64,
    height: 60.91,
  },
  {
    id: "circle-6",
    name: "Round 6",
    shape: "round",
    component: CircleTable6Person,
    defaultCapacity: 6,
    description: "6-person round table",
    width: 70.91,
    height: 71.82,
  },
  {
    id: "square-6",
    name: "Long 6",
    shape: "long-rectangle",
    component: SquareTable6Person,
    defaultCapacity: 6,
    description: "6-person long table",
    width: 112.73,
    height: 52.73,
  },
  {
    id: "circle-8",
    name: "Round 8",
    shape: "round",
    component: CircleTable8Person,
    defaultCapacity: 8,
    description: "8-person round table",
    width: 80.91,
    height: 80.45,
  },
  {
    id: "square-8",
    name: "Long 8",
    shape: "long-rectangle",
    component: SquareTable8Person,
    defaultCapacity: 8,
    description: "8-person long table",
    width: 148.18,
    height: 52.73,
  },
];

export const TableStructurePreview: React.FC<{ structure: TableStructure }> = ({ structure }) => {
  const TableComponent = structure.component;
  
  return (
    <div className="flex items-center justify-center p-2">
      <TableComponent 
        width={Math.min(structure.width * 0.6, 50)} 
        height={Math.min(structure.height * 0.6, 50)} 
        className="transition-transform hover:scale-110"
      />
    </div>
  );
};

export const getDraggableTableStructure = (structureId: string): TableStructure | null => {
  return TABLE_STRUCTURES.find(structure => structure.id === structureId) || null;
};