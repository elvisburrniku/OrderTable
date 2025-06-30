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
    width: 35,
    height: 45,
  },
  {
    id: "circle-1",
    name: "Round 1",
    shape: "circle",
    component: CircleTable1Person,
    defaultCapacity: 1,
    description: "1-person round table",
    width: 38,
    height: 38,
  },
  {
    id: "square-2",
    name: "Square 2",
    shape: "square",
    component: SquareTable2Person,
    defaultCapacity: 2,
    description: "2-person square table",
    width: 35,
    height: 45,
  },
  {
    id: "circle-2",
    name: "Round 2",
    shape: "circle",
    component: CircleTable2Person,
    defaultCapacity: 2,
    description: "2-person round table",
    width: 38,
    height: 38,
  },
  {
    id: "circle-3",
    name: "Round 3",
    shape: "round",
    component: CircleTable3Person,
    defaultCapacity: 3,
    description: "3-person round table",
    width: 42,
    height: 40,
  },
  {
    id: "square-4",
    name: "Square 4",
    shape: "square",
    component: SquareTable4Person,
    defaultCapacity: 4,
    description: "4-person square table",
    width: 65,
    height: 45,
  },
  {
    id: "square-4-compact",
    name: "Square 4 Compact",
    shape: "square",
    component: SquareTable4PersonCompact,
    defaultCapacity: 4,
    description: "4-person compact square table",
    width: 52,
    height: 52,
  },
  {
    id: "circle-4",
    name: "Round 4",
    shape: "round",
    component: CircleTable4Person,
    defaultCapacity: 4,
    description: "4-person round table",
    width: 45,
    height: 45,
  },
  {
    id: "circle-5",
    name: "Round 5",
    shape: "round",
    component: CircleTable5Person,
    defaultCapacity: 5,
    description: "5-person round table",
    width: 54,
    height: 52,
  },
  {
    id: "circle-6",
    name: "Round 6",
    shape: "round",
    component: CircleTable6Person,
    defaultCapacity: 6,
    description: "6-person round table",
    width: 60,
    height: 61,
  },
  {
    id: "square-6",
    name: "Long 6",
    shape: "long-rectangle",
    component: SquareTable6Person,
    defaultCapacity: 6,
    description: "6-person long table",
    width: 95,
    height: 45,
  },
  {
    id: "circle-8",
    name: "Round 8",
    shape: "round",
    component: CircleTable8Person,
    defaultCapacity: 8,
    description: "8-person round table",
    width: 68,
    height: 68,
  },
  {
    id: "square-8",
    name: "Long 8",
    shape: "long-rectangle",
    component: SquareTable8Person,
    defaultCapacity: 8,
    description: "8-person long table",
    width: 125,
    height: 45,
  },
  {
    id: "circle-12",
    name: "Round 12",
    shape: "round",
    component: CircleTable8Person,
    defaultCapacity: 12,
    description: "12-person round table",
    width: 68,
    height: 68,
  },
  {
    id: "square-12",
    name: "Long 12",
    shape: "long-rectangle",
    component: SquareTable8Person,
    defaultCapacity: 12,
    description: "12-person long table",
    width: 125,
    height: 45,
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