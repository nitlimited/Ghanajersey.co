import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, languages, currencies, USD_TO_GHS_RATE } from './translations';

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
  
  // Try IP geolocation API
  try {
    const response = await fetch('https://ipapi.co/json/', { timeout: 3000 });
    if (response.ok) {
      const data = await response.json();
      return data.country_code;
    }
  } catch (error) {
    console.log('Geolocation detection failed, using default');
  }
  
  // Default to non-Ghana
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
  
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('bst_currency') || 'USD';
  });
  
  const [isGhana, setIsGhana] = useState(false);
  const [countryDetected, setCountryDetected] = useState(false);

  // Detect country on mount
  useEffect(() => {
    const detect = async () => {
      // Check if user manually set currency
      const manualCurrency = localStorage.getItem('bst_currency_manual');
      if (manualCurrency) {
        setCountryDetected(true);
        return;
      }
      
      const country = await detectCountry();
      const userInGhana = country === 'GH';
      setIsGhana(userInGhana);
      
      // Auto-set currency based on location (only if not manually set)
      if (!localStorage.getItem('bst_currency')) {
        const newCurrency = userInGhana ? 'GHS' : 'USD';
        setCurrency(newCurrency);
        localStorage.setItem('bst_currency', newCurrency);
      }
      
      setCountryDetected(true);
    };
    
    detect();
  }, []);

  // Save language preference
  const changeLanguage = useCallback((newLang) => {
    if (languages.find(l => l.code === newLang)) {
      setLanguage(newLang);
      localStorage.setItem('bst_language', newLang);
    }
  }, []);

  // Save currency preference (manual override)
  const changeCurrency = useCallback((newCurrency) => {
    if (currencies[newCurrency]) {
      setCurrency(newCurrency);
      localStorage.setItem('bst_currency', newCurrency);
      localStorage.setItem('bst_currency_manual', 'true'); // Mark as manually set
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

  // Format price based on currency preference and product prices
  const formatPrice = useCallback((priceUSD, priceGHS = null) => {
    const currencyInfo = currencies[currency];
    
    if (currency === 'GHS') {
      // Use GHS price if available, otherwise convert from USD
      const price = priceGHS || (priceUSD * USD_TO_GHS_RATE);
      return `${currencyInfo.symbol}${price.toFixed(2)}`;
    } else {
      // Use USD price
      return `${currencyInfo.symbol}${priceUSD.toFixed(2)}`;
    }
  }, [currency]);

  // Get the appropriate price value
  const getPrice = useCallback((priceUSD, priceGHS = null) => {
    if (currency === 'GHS') {
      return priceGHS || (priceUSD * USD_TO_GHS_RATE);
    }
    return priceUSD;
  }, [currency]);

  // Get currency symbol
  const getCurrencySymbol = useCallback(() => {
    return currencies[currency].symbol;
  }, [currency]);

  const value = {
    // State
    language,
    currency,
    isGhana,
    countryDetected,
    
    // Actions
    changeLanguage,
    changeCurrency,
    
    // Helpers
    t,
    formatPrice,
    getPrice,
    getCurrencySymbol,
    
    // Data
    languages,
    currencies,
    currentLanguage: languages.find(l => l.code === language),
    currentCurrency: currencies[currency]
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
};

export default LocalizationProvider;
