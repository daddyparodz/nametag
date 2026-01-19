'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';
const SUPPORTED_LOCALES = ['en', 'es-ES', 'it-IT'] as const;

function isSupportedLocale(locale: string): boolean {
  return SUPPORTED_LOCALES.includes(locale as typeof SUPPORTED_LOCALES[number]);
}

export default function LocaleSync() {
  const { data: session } = useSession();

  useEffect(() => {
    const language = session?.user?.language;
    if (!language || !isSupportedLocale(language)) {
      return;
    }

    const currentCookie = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith(`${LOCALE_COOKIE_NAME}=`))
      ?.split('=')[1];

    if (currentCookie === language) {
      return;
    }

    const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
    const secure = window.location.protocol === 'https:' ? '; secure' : '';
    const domainAttr = domain ? `; domain=${domain}` : '';
    const reloadKey = `locale-sync:${language}`;
    const alreadyReloaded = sessionStorage.getItem(reloadKey) === '1';

    document.cookie = `${LOCALE_COOKIE_NAME}=${language}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax${secure}${domainAttr}`;
    const updatedCookie = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith(`${LOCALE_COOKIE_NAME}=`))
      ?.split('=')[1];

    if (updatedCookie === language && !alreadyReloaded) {
      sessionStorage.setItem(reloadKey, '1');
      window.location.reload();
    } else if (alreadyReloaded) {
      sessionStorage.removeItem(reloadKey);
    }
  }, [session?.user?.language]);

  return null;
}
