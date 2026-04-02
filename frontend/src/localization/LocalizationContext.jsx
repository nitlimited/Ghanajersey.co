import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, languages, currencies } from './translations';

// Create contexts
const LocalizationContext = createContext(null);

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within LocalizationProvider');
  }
  return context;
};

// Helper to detect country from timezone or IP
const detectCountry = async () => {
  // Try to detect from timezone first (faster, no API call)
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (timezone && timezone.includes('Accra')) {
    return 'GH';
  }

  const tryFetchCountryCode = async (url, getCountryCode) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const countryCode = getCountryCode(data);
      return typeof countryCode === 'string' ? countryCode.toUpperCase() : null;
    } catch (error) {
      return null;
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const providers = [
    ['https://ipapi.co/json/', (data) => data.country_code],
    ['https://ipwho.is/', (data) => data.country_code]
  ];

  for (const [url, getCountryCode] of providers) {
    const countryCode = await tryFetchCountryCode(url, getCountryCode);
    if (countryCode) {
      return countryCode;
    }
  }

  return null;
};

// Helper to detect browser language
const detectBrowserLanguage = () => {
  const browserLang = navigator.language?.split('-')[0] || 'en';
  const supportedLangs = languages.map(l => l.code);
  return supportedLangs.includes(browserLang) ? browserLang : 'en';
};

export const LocalizationProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('bst_language') || detectBrowserLanguage();
  });
  
  // Currency is determined ONLY by geolocation - no user switching
  const [isGhana, setIsGhana] = useState(false);
  const [countryDetected, setCountryDetected] = useState(false);

  // Detect country on mount - this determines currency automatically
  useEffect(() => {
    const COUNTRY_CACHE_KEY = 'bst_country_detection';
    const GHANA_CACHE_KEY = 'bst_is_ghana';
    const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

    const detect = async () => {
      const country = await detectCountry();
      const userInGhana = country === 'GH';

      if (country) {
        localStorage.setItem(COUNTRY_CACHE_KEY, JSON.stringify({
          countryCode: country,
          detectedAt: Date.now()
        }));
      }

      localStorage.setItem(GHANA_CACHE_KEY, userInGhana ? 'true' : 'false');
      setIsGhana(userInGhana);
      setCountryDetected(true);
    };

    const cachedDetection = localStorage.getItem(COUNTRY_CACHE_KEY);
    const storedIsGhana = localStorage.getItem(GHANA_CACHE_KEY);

    if (cachedDetection) {
      try {
        const parsed = JSON.parse(cachedDetection);
        const isFresh = parsed?.detectedAt && (Date.now() - parsed.detectedAt) < CACHE_TTL_MS;

        if (isFresh && parsed?.countryCode) {
          setIsGhana(parsed.countryCode === 'GH');
          setCountryDetected(true);
          return;
        }
      } catch (error) {
        console.log('Failed to parse cached country detection');
      }
    }

    if (storedIsGhana !== null) {
      setIsGhana(storedIsGhana === 'true');
      setCountryDetected(true);
    }

    detect();
  }, []);

  // Save language preference
  const changeLanguage = useCallback((newLang) => {
    if (languages.find(l => l.code === newLang)) {
      setLanguage(newLang);
      localStorage.setItem('bst_language', newLang);
    }
  }, []);

  // Get translation function
  const t = useCallback((key) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        // Fallback to English
        value = translations['en'];
        for (const k2 of keys) {
          if (value && typeof value === 'object') {
            value = value[k2];
          }
        }
        break;
      }
    }
    
    return value || key;
  }, [language]);

  // Format price based on location - shows vendor-set price (NO conversion)
  // For Ghana users: show GHS price if available, otherwise show USD with note
  // For international users: show USD price
  const formatPrice = useCallback((priceUSD, priceGHS = null) => {
    if (isGhana) {
      // Ghana user - show GHS price if vendor set it
      if (priceGHS !== null && priceGHS !== undefined && priceGHS > 0) {
        return `GH₵${priceGHS.toFixed(2)}`;
      }
      // Fallback: if vendor didn't set GHS price, show USD
      return `$${priceUSD.toFixed(2)}`;
    } else {
      // International user - show USD price
      return `$${priceUSD.toFixed(2)}`;
    }
  }, [isGhana]);

  // Get the raw price value based on location
  const getPrice = useCallback((priceUSD, priceGHS = null) => {
    if (isGhana && priceGHS !== null && priceGHS !== undefined && priceGHS > 0) {
      return priceGHS;
    }
    return priceUSD;
  }, [isGhana]);

  // Get currency symbol based on location
  const getCurrencySymbol = useCallback(() => {
    return isGhana ? 'GH₵' : '$';
  }, [isGhana]);

  // Get currency code based on location
  const getCurrencyCode = useCallback(() => {
    return isGhana ? 'GHS' : 'USD';
  }, [isGhana]);

  const value = {
    // State
    language,
    isGhana,
    countryDetected,
    currency: isGhana ? 'GHS' : 'USD',
    
    // Actions
    changeLanguage,
    
    // Helpers
    t,
    formatPrice,
    getPrice,
    getCurrencySymbol,
    getCurrencyCode,
    
    // Data
    languages,
    currencies,
    currentLanguage: languages.find(l => l.code === language),
    currentCurrency: isGhana ? currencies.GHS : currencies.USD
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
};

export default LocalizationProvider;
