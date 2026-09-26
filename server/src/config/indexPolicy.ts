/**
 * Index lifecycle policy.
 *
 * Kept in its own side-effect-free module so the rule can be asserted directly
 * by tests without importing the database bootstrap (which loads configuration
 * and a connection string on import).
 */

/**
 * Decides whether opening a connection may build schema-declared indexes.
 *
 * Mongoose builds every declared index by default as soon as a connection
 * opens. For OM Cellular that is only safe away from production:
 *
 * - Production must return `false`. A deploy that adds an index to the schema
 *   would otherwise create it on the live database merely by booting, with no
 *   audit, no data check and no rollback. Index changes are made deliberately,
 *   as a reviewed operator step, before the code that depends on them ships.
 * - Development and the real-MongoDB regression suite return `true`, so local
 *   iteration and the test harness keep getting the indexes their assertions
 *   rely on. The harness additionally builds them explicitly, so this default is
 *   a convenience rather than the suite's only mechanism.
 */
export function indexLifecycleOptions(isProduction: boolean): {
  autoIndex: boolean
  autoCreate: boolean
} {
  return { autoIndex: !isProduction, autoCreate: !isProduction }
}
