export enum Relation {
  HUSBAND = 'Husband',
  WIFE = 'Wife',
  SON = 'Son',
  DAUGHTER = 'Daughter',
  FATHER = 'Father',
  MOTHER = 'Mother',
  OTHER = 'Other'
}

export enum PropertyType {
  RESIDENTIAL = 'Residential',
  COMMERCIAL = 'Commercial',
  AGRICULTURAL = 'Agricultural',
  PLOT = 'Plot'
}

export interface Party {
  id: string;
  name: string;
  relation: Relation;
  shariahSharePercentage: number; // 0 to 100
  fixedShare?: string; // e.g., "1/8"
}

export interface Property {
  id: string;
  name: string;
  type: PropertyType;
  areaSqFt: number;
  areaSqYards: number;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  valuationSource: 'MANUAL' | 'AI';
  pricePerSqFt: number;
  totalValue: number;
  originalValue?: number; // Snapshot of the initial valuation for negotiation reference
  assignedToPartyId: string | null; // null means unassigned
  description?: string;
  aiAnalysis?: string;
}

export interface HistoricalDataPoint {
  year: number;
  goldRate: number; // PKR per Tola
  propertyIndex: number; // Normalized index or avg price/sqft
}

export interface AppState {
  step: number; // 0: Setup, 1: Properties, 2: Valuation, 3: Distribution
  deceasedName: string;
  totalEstateValue: number;
}