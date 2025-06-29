type FeatureArray<T> = T | T[] | undefined

/**
 * Normalize a possibly-singleton feature into an array.
 *
 * @param item - A feature or array of features
 * @returns An array of features (possibly empty)
 */
export function asArray<T>(item: FeatureArray<T>): T[] {
  if (!item) return []
  return Array.isArray(item) ? item : [item]
}
