import { NextResponse } from 'next/server';
import rentsDataT1T2 from '../../../data/rents.json';
import rentsDataT3 from '../../../data/rents_t3.json';
import rentsDataHouse from '../../../data/rents_house.json';

type DatasetEntry = {
  avg: number;
  low: number | null;
  high: number | null;
};

type PropertyType = 'apartment' | 'house' | 'building';

const normalizeCity = (name: string | null | undefined) =>
  (name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/-/g, ' ')
    .replace(/[^a-z0-9 ]/gi, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const getDataset = (rooms: number | null, propertyType: PropertyType | null) => {
  if (propertyType === 'house') {
    return rentsDataHouse as Record<string, DatasetEntry>;
  }
  if (rooms !== null && rooms > 2) {
    return rentsDataT3 as Record<string, DatasetEntry>;
  }
  return rentsDataT1T2 as Record<string, DatasetEntry>;
};

const toMonthlyHc = (rentPerM2: number | null, surface: number) => {
  if (rentPerM2 === null || !Number.isFinite(rentPerM2) || surface <= 0) {
    return null;
  }
  return Math.round(rentPerM2 * surface * 0.9);
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = normalizeCity(searchParams.get('city'));
  const surface = Number(searchParams.get('surface'));
  const roomsParam = searchParams.get('rooms');
  const rooms = roomsParam ? Number(roomsParam) : null;
  const propertyTypeParam = searchParams.get('propertyType');
  const propertyType =
    propertyTypeParam === 'apartment' || propertyTypeParam === 'house' || propertyTypeParam === 'building'
      ? propertyTypeParam
      : null;

  if (!city || !Number.isFinite(surface) || surface <= 0) {
    return NextResponse.json({
      marketRentAvg: null,
      marketRentLow: null,
      marketRentHigh: null,
    });
  }

  const dataset = getDataset(Number.isFinite(rooms) ? rooms : null, propertyType);
  const entry = dataset[city];

  if (!entry || !Number.isFinite(entry.avg)) {
    return NextResponse.json({
      marketRentAvg: null,
      marketRentLow: null,
      marketRentHigh: null,
    });
  }

  return NextResponse.json({
    marketRentAvg: toMonthlyHc(entry.avg, surface),
    marketRentLow: toMonthlyHc(entry.low, surface),
    marketRentHigh: toMonthlyHc(entry.high, surface),
  });
}
