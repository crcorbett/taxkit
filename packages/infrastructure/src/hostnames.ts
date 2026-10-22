import * as Schema from "effect/Schema";

export const HostName = Schema.String.check(
  Schema.isPattern(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/u)
).pipe(Schema.brand("taxkit/HostName"));
export type HostName = typeof HostName.Type;

/**
 * Every TaxKit Production hostname, written once. This module imports no
 * provider code; the apps graph derives its zone, custom domains and the
 * publication origin from it. The Website serves the zone apex.
 */
export const taxKitZoneName = HostName.make("taxkit.dev");
export const websiteRedirectHostName = HostName.make(`www.${taxKitZoneName}`);
export const apiHostName = HostName.make(`api.${taxKitZoneName}`);

// Published pages and discovery documents name the Production site in every
// stage, including Preview. Each host still binds its own native address.
export const publicationOrigin = `https://${taxKitZoneName}` as const;
