/** Match website trending destinations for location suggestions. */
export type TrendingDestination = { name: string; country: string };

const DESTINATIONS: TrendingDestination[] = [
  { name: 'London', country: 'United Kingdom' },
  { name: 'Liverpool', country: 'United Kingdom' },
  { name: 'Manchester', country: 'United Kingdom' },
  { name: 'Chester', country: 'United Kingdom' },
  { name: 'Edinburgh', country: 'United Kingdom' },
  { name: 'Birmingham', country: 'United Kingdom' },
  { name: 'Leeds', country: 'United Kingdom' },
  { name: 'Bristol', country: 'United Kingdom' },
  { name: 'Glasgow', country: 'United Kingdom' },
  { name: 'Newcastle', country: 'United Kingdom' },
  { name: 'Cardiff', country: 'United Kingdom' },
  { name: 'Sheffield', country: 'United Kingdom' },
  { name: 'Nottingham', country: 'United Kingdom' },
  { name: 'Southampton', country: 'United Kingdom' },
];

export function filterTrendingDestinations(query: string): TrendingDestination[] {
  if (!query.trim()) return DESTINATIONS;
  const q = query.toLowerCase().trim();
  return DESTINATIONS.filter(
    (d) =>
      d.name.toLowerCase().includes(q) ||
      d.country.toLowerCase().includes(q) ||
      d.name.toLowerCase().startsWith(q)
  );
}
