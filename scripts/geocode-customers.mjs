/**
 * Geocode sticker customers from CSV to JSON with city-level coordinates.
 * Uses Nominatim (OSM) — 1 request/sec rate limit.
 * Run: node scripts/geocode-customers.mjs
 */

import { readFileSync, writeFileSync } from 'fs';

const csv = readFileSync('/Users/cc/aliexpress-ops/sticker-customers.csv', 'utf-8');
const lines = csv.trim().split('\n').slice(1); // skip header

// Extract city + country from each row
const customers = lines.filter(l => l.trim()).map(line => {
  // CSV format: #,姓名,收货地址,国家,下单时间,状态
  const match = line.match(/^(\d+),([^,]+),"?([^"]*)"?,([^,]+),([^,]+),(.+)$/);
  if (!match) return null;
  const [, id, name, address, countryZh] = match;

  // Map Chinese country names to English
  const countryMap = {
    '德国': 'Germany', '日本': 'Japan', '韩国': 'South Korea',
    '法国': 'France', '瑞士': 'Switzerland', '加拿大': 'Canada',
    '西班牙': 'Spain', '比利时': 'Belgium', '澳大利亚': 'Australia',
    '波兰': 'Poland', '新加坡': 'Singapore', '芬兰': 'Finland',
    '匈牙利': 'Hungary', '智利': 'Chile', '荷兰': 'Netherlands',
    '葡萄牙': 'Portugal',
  };
  const country = countryMap[countryZh.trim()] || countryZh.trim();

  // Extract city from address (last part before postal code patterns)
  let city = extractCity(address, country);

  return { id: Number(id), name: name.trim(), city, country };
}).filter(Boolean);

function extractCity(addr, country) {
  // For different address formats, extract the city
  if (country === 'Germany') {
    // "Street, POSTAL City" format
    const m = addr.match(/\d{5}\s+(.+?)$/);
    return m ? m[1] : addr.split(',').pop().trim();
  }
  if (country === 'Japan') {
    // Japanese addresses: "..., City, Prefecture"
    const parts = addr.split(',').map(s => s.trim());
    return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  }
  if (country === 'South Korea') {
    // "..., City/District, Province"
    const parts = addr.split(',').map(s => s.trim());
    return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  }
  if (country === 'France') {
    // "Street, POSTAL City, Department" or "Street, POSTAL City"
    const m = addr.match(/\d{5}\s+([^,]+)/);
    return m ? m[1] : addr.split(',').pop().trim();
  }
  if (country === 'Switzerland') {
    const m = addr.match(/\d{4}\s+([^,]+)/);
    return m ? m[1] : addr.split(',').pop().trim();
  }
  if (country === 'Canada') {
    const parts = addr.split(',').map(s => s.trim());
    return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  }
  if (country === 'Spain') {
    const parts = addr.split(',').map(s => s.trim());
    return parts[parts.length - 1];
  }
  if (country === 'Belgium') {
    const parts = addr.split(',').map(s => s.trim());
    return parts[parts.length - 1];
  }
  if (country === 'Australia') {
    const parts = addr.split(',').map(s => s.trim());
    // "street, POSTAL City, STATE"
    const m = addr.match(/\d{4}\s+([^,]+)/);
    return m ? m[1] : parts[parts.length - 1];
  }
  if (country === 'Poland') {
    const m = addr.match(/\d{5}\s+(.+?)$/);
    return m ? m[1] : addr.split(',').pop().trim();
  }
  if (country === 'Singapore') return 'Singapore';
  if (country === 'Finland') {
    const parts = addr.split(',').map(s => s.trim());
    return parts[parts.length - 1];
  }
  if (country === 'Hungary') {
    const m = addr.match(/\d{4}\s+(.+?)$/);
    return m ? m[1] : addr.split(',').pop().trim();
  }
  if (country === 'Chile') {
    const parts = addr.split(',').map(s => s.trim());
    return parts[parts.length - 1];
  }
  if (country === 'Netherlands') {
    const parts = addr.split(',').map(s => s.trim());
    // "Street, POSTAL, City" or "Street, POSTALCITY"
    const m = addr.match(/\d{4}[A-Z]{2},?\s*(.+?)$/);
    if (m) return m[1];
    return parts[parts.length - 1];
  }
  if (country === 'Portugal') {
    const parts = addr.split(',').map(s => s.trim());
    return parts[parts.length - 1];
  }
  // Fallback
  const parts = addr.split(',').map(s => s.trim());
  return parts[parts.length - 1];
}

console.log('Extracted cities:');
customers.forEach(c => console.log(`  ${c.id}. ${c.name} → ${c.city}, ${c.country}`));

// Geocode each city+country
async function geocode(city, country) {
  const q = encodeURIComponent(`${city}, ${country}`);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'TRACKID-Gallery/1.0' },
  });
  const data = await res.json();
  if (data.length > 0) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  }
  return null;
}

async function main() {
  const results = [];
  for (const c of customers) {
    const coords = await geocode(c.city, c.country);
    if (coords) {
      // Add small random offset so markers in same city don't stack
      const jitter = () => (Math.random() - 0.5) * 0.02;
      results.push({
        city: c.city,
        country: c.country,
        lat: Math.round((coords.lat + jitter()) * 10000) / 10000,
        lng: Math.round((coords.lng + jitter()) * 10000) / 10000,
      });
      console.log(`  ✓ ${c.city}, ${c.country} → ${coords.lat}, ${coords.lng}`);
    } else {
      console.log(`  ✗ ${c.city}, ${c.country} — NOT FOUND`);
    }
    // Rate limit: 1 req/sec
    await new Promise(r => setTimeout(r, 1100));
  }

  // Deduplicate by city (keep unique city+country pairs with jitter)
  writeFileSync(
    new URL('../src/data/sticker-customers.json', import.meta.url),
    JSON.stringify(results, null, 2),
    'utf-8'
  );
  console.log(`\nSaved ${results.length} locations to src/data/sticker-customers.json`);
}

main();
