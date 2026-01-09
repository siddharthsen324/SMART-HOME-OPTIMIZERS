
export enum FurnitureType {
  CHAIR = 'Chair',
  TABLE = 'Table',
  SOFA = 'Sofa',
  BED = 'Bed',
  DESK = 'Desk',
  CABINET = 'Cabinet',
  OTHER = 'Other'
}

export interface Dimensions {
  width: number; // in cm
  depth: number; // in cm
  height: number; // in cm
}

export interface FurnitureItem {
  id: string;
  name: string;
  type: FurnitureType;
  dimensions: Dimensions;
  position: { x: number; y: number };
  rotation: number;
  imageUrl?: string;
}

export interface Room {
  id: string;
  name: string;
  width: number;
  depth: number;
  items: FurnitureItem[];
  imageUrl?: string;
}

export interface ScanResult {
  type: 'room' | 'furniture';
  data: any;
}
