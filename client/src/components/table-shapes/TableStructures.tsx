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
    width: 60,
    height: 60,
  },
  {
    id: "circle-1",
    name: "Square 1",
    shape: "square",
    component: SquareTable1Person,
    defaultCapacity: 1,
    description: "1-person square table",
    width: 60,
    height: 60,
  },
  {
    id: "square-2",
    name: "Square 2",
    shape: "square",
    component: SquareTable2Person,
    defaultCapacity: 2,
    description: "2-person square table",
    width: 60,
    height: 60,
  },
  {
    id: "circle-2",
    name: "Square 2",
    shape: "square",
    component: SquareTable2Person,
    defaultCapacity: 2,
    description: "2-person square table",
    width: 60,
    height: 60,
  },
  {
    id: "circle-3",
    name: "Square 3",
    shape: "square",
    component: SquareTable4PersonCompact,
    defaultCapacity: 3,
    description: "3-person square table",
    width: 60,
    height: 60,
  },
  {
    id: "square-4",
    name: "Square 4",
    shape: "square",
    component: SquareTable4PersonCompact,
    defaultCapacity: 4,
    description: "4-person square table",
    width: 60,
    height: 60,
  },
  {
    id: "square-4-compact",
    name: "Square 4",
    shape: "square",
    component: SquareTable4PersonCompact,
    defaultCapacity: 4,
    description: "4-person square table",
    width: 60,
    height: 60,
  },
  {
    id: "circle-4",
    name: "Square 4",
    shape: "square",
    component: SquareTable4PersonCompact,
    defaultCapacity: 4,
    description: "4-person square table",
    width: 60,
    height: 60,
  },
  {
    id: "circle-5",
    name: "Square 5",
    shape: "square",
    component: SquareTable4PersonCompact,
    defaultCapacity: 5,
    description: "5-person square table",
    width: 60,
    height: 60,
  },
  {
    id: "circle-6",
    name: "Square 6",
    shape: "square",
    component: SquareTable6Person,
    defaultCapacity: 6,
    description: "6-person square table",
    width: 60,
    height: 60,
  },
  {
    id: "square-6",
    name: "Square 6",
    shape: "square",
    component: SquareTable6Person,
    defaultCapacity: 6,
    description: "6-person square table",
    width: 60,
    height: 60,
  },
  {
    id: "circle-8",
    name: "Square 8",
    shape: "square",
    component: SquareTable8Person,
    defaultCapacity: 8,
    description: "8-person square table",
    width: 60,
    height: 60,
  },
  {
    id: "square-8",
    name: "Square 8",
    shape: "square",
    component: SquareTable8Person,
    defaultCapacity: 8,
    description: "8-person square table",
    width: 60,
    height: 60,
  },
  {
    id: "circle-12",
    name: "Square 12",
    shape: "square",
    component: SquareTable8Person,
    defaultCapacity: 12,
    description: "12-person square table",
    width: 60,
    height: 60,
  },
  {
    id: "square-12",
    name: "Square 12",
    shape: "square",
    component: SquareTable8Person,
    defaultCapacity: 12,
    description: "12-person square table",
    width: 60,
    height: 60,
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