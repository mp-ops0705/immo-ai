import { NextResponse } from 'next/server';
import rentsDataT1T2 from '../../../../data/rents.json';
import rentsDataT3 from '../../../../data/rents_t3.json';
import rentsDataHouse from '../../../../data/rents_house.json';

type Dataset = Record<string, unknown>;

const normalizeCity = (name: string | null | undefined) =>
  (name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/-/g, ' ')
    .replace(/[^a-z0-9 ]/gi, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const formatCityLabel = (city: string) =>
  city
    .split(' ')
    .map((word) => (word ? `${word[0].toUpperCase()}${word.slice(1)}` : word))
    .join(' ');

const cityNames = Array.from(
  new Set([
    ...Object.keys(rentsDataT1T2 as Dataset),
    ...Object.keys(rentsDataT3 as Dataset),
    ...Object.keys(rentsDataHouse as Dataset),
  ])
).sort((a, b) => a.localeCompare(b, 'fr'));

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = normalizeCity(searchParams.get('q'));

  if (query.length < 2) {
    return NextResponse.json({ cities: [] });
  }

  const startsWithMatches = cityNames.filter((city) => city.startsWith(query));
  const containsMatches = cityNames.filter(
    (city) => !city.startsWith(query) && city.includes(query)
  );
  const cities = [...startsWithMatches, ...containsMatches]
    .slice(0, 25)
    .map((city) => ({
      value: city,
      label: formatCityLabel(city),
    }));

  return NextResponse.json({ cities });
}
