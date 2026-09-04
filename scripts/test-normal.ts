import { sanitizeCatalogPayload } from '../lib/sanitization';
import mockCatalog from '../data/mockCatalog.json';

const normalItems = mockCatalog.slice(3, 8);

console.log("Testing 5 normal products for mangling or false positives:");
for (const item of normalItems) {
  const raw = JSON.stringify(item);
  const result = sanitizeCatalogPayload(raw);
  if (result.stripped.length > 0) {
    console.error(`FALSE POSITIVE! Stripped:`, result.stripped);
  } else if (result.sanitized !== raw) {
    console.error(`MANGLED!`);
    console.error(`Before:`, raw);
    console.error(`After: `, result.sanitized);
  } else {
    console.log(`OK: ${item.name}`);
  }
}
