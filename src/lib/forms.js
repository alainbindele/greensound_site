/**
 * Prepares an API record for use as controlled-form state.
 *
 * Optional columns come back as `null` from the database. Handing `null` to a
 * controlled <Input> makes React warn and flips the field to uncontrolled, so
 * every null becomes an empty string. Arrays and booleans are already
 * normalised by the API, so only text and number columns are affected.
 */
export function nullsToEmpty(record) {
  const out = {};
  for (const [key, value] of Object.entries(record || {})) {
    out[key] = value === null || value === undefined ? '' : value;
  }
  return out;
}
