import { CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js';

/** The country pre-selected in the phone field. Change it to suit your audience. */
export const DEFAULT_COUNTRY: CountryCode = 'NG';

export interface PhoneValue {
  country: CountryCode;
  national: string;
}

/** International format (+2348012345678) when valid for that country, otherwise null. */
export function toE164({ country, national }: PhoneValue): string | null {
  const parsed = parsePhoneNumberFromString(national, country);
  return parsed?.isValid() ? parsed.number : null;
}
