export const SUPPORTED_LOCALES = ['en', 'es-ES', 'it-IT'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const LANGUAGE_OPTIONS: Array<{
  code: SupportedLocale;
  name: string;
  flag: string;
  labelKey: 'en' | 'esES' | 'itIT';
}> = [
  { code: 'en', name: 'English', flag: 'gb', labelKey: 'en' },
  { code: 'es-ES', name: 'Espanol (Espana)', flag: 'es', labelKey: 'esES' },
  { code: 'it-IT', name: 'Italiano (Italia)', flag: 'it', labelKey: 'itIT' },
];
