type FeatureArray<T> = T | T[] | undefined

/**
 * Normalizes a feature or an array of features into an array.
 *
 * If the input is `undefined`, returns an empty array.
 * If the input is a single feature, wraps it in an array.
 * If the input is already an array, returns it as-is.
 *
 * @template T
 * @param {FeatureArray<T>} item - A feature, an array of features, or undefined.
 * @returns {T[]} An array of features (possibly empty).
 */
export function asArray<T>(item: FeatureArray<T>): T[] {
  if (!item) return []
  return Array.isArray(item) ? item : [item]
}
