import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, type SupportedLocale, isSupportedLocale } from './lib/locale';

/**
 * next-intl configuration
 * This runs on every request to determine the locale
 * Note: We can't use auth() here due to Next.js 16 limitations
 */
export default getRequestConfig(async () => {
  // Try to get locale from cookie first
  let locale: SupportedLocale = DEFAULT_LOCALE;

  try {
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get('NEXT_LOCALE');

    if (localeCookie?.value && isSupportedLocale(localeCookie.value)) {
      locale = localeCookie.value;
    }
  } catch (error) {
    console.error('Error detecting locale:', error);
  }

  return {
    locale,
    messages: (await import(`./locales/${locale}.json`)).default,
  };
});
