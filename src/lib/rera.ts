export function inferReraAuthority(city: string): string {
  const value = city.toLowerCase();
  if (value.includes('kerala') || value.includes('kochi') || value.includes('thiruvananthapuram')) return 'K-RERA';
  if (value.includes('mumbai') || value.includes('maharashtra') || value.includes('pune')) return 'MahaRERA';
  if (value.includes('bengaluru') || value.includes('bangalore') || value.includes('karnataka')) return 'Karnataka RERA';
  return '';
}
