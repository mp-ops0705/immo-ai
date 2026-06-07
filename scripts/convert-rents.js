#!/usr/bin/env node
/**
 * Usage : node convert-rents.js source.csv output.json
 * Convertit un CSV ANIL en dictionnaire { "saint etienne": 14.8, ... }.
 */
const fs = require('fs');
const path = require('path');

if (process.argv.length < 4) {
  console.error('Usage : node convert-rents.js <input.csv> <output.json>');
  process.exit(1);
}

const [inputFile, outputFile] = process.argv.slice(2);

const normalizeCity = (name = '') =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // accents
    .replace(/-/g, ' ') // tirets -> espaces
    .replace(/[^a-z0-9 ]/gi, ' ') // autres signes -> espace
    .toLowerCase()
    .replace(/\s+/g, ' ') // pas de doubles espaces
    .trim();

const safeParse = (value) => {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, '').replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
};

const raw = fs.readFileSync(path.resolve(inputFile), 'utf8');
const lines = raw.trim().split(/\r?\n/);
if (lines.length < 2) {
  console.error('CSV vide ou sans données');
  process.exit(1);
}

const header = lines.shift().split(';').map((h) => h.trim());
const idxCity = header.indexOf('LIBGEO');
const idxRent = header.indexOf('loypredm2');
const idxLow = header.indexOf('lwr.IPm2');
const idxHigh = header.indexOf('upr.IPm2');

if (idxCity === -1 || idxRent === -1) {
  console.error('Colonnes LIBGEO ou loypredm2 introuvables.');
  process.exit(1);
}

if (idxLow === -1 || idxHigh === -1) {
  console.warn(
    'Colonnes lwr.IPm2 ou upr.IPm2 introuvables, seules les valeurs moyennes seront exportées.'
  );
}

const rentMap = {};

for (const line of lines) {
  if (!line.trim()) continue;
  const cols = line.split(';');
  const cityName = normalizeCity(cols[idxCity]);

  if (!cityName) continue;

  const rentValue = safeParse(cols[idxRent]);
  if (!Number.isFinite(rentValue)) continue;

  const lowValue = idxLow !== -1 ? safeParse(cols[idxLow]) : null;
  const highValue = idxHigh !== -1 ? safeParse(cols[idxHigh]) : null;

  rentMap[cityName] = {
    avg: rentValue,
    low: lowValue ?? null,
    high: highValue ?? null,
  };
}

fs.writeFileSync(
  path.resolve(outputFile),
  JSON.stringify(rentMap, null, 2),
  'utf8'
);

console.log(`✅ ${Object.keys(rentMap).length} communes enregistrées → ${outputFile}`);
