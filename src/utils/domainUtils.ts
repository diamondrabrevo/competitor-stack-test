/**
 * Domain utility functions
 */

/**
 * Normalizes a domain by removing protocols and trailing slashes
 * @param domain - The domain to normalize
 * @returns The normalized domain
 */
export const normalizeDomain = (domain: string): string => {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
};
