import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useLocalization } from './LocalizationContext';

const LanguageSelector = ({ variant = 'default' }) => {
  const { 
    language, 
    changeLanguage, 
    languages,
    currentLanguage,
    isGhana
  } = useLocalization();
  
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isLight = variant === 'light';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 text-sm font-body transition-colors ${
          isLight 
            ? 'text-black hover:text-ashanti-gold' 
            : 'text-white hover:text-ashanti-gold'
        }`}
        data-testid="lang-selector"
      >
        <span className="text-lg">{currentLanguage?.flag}</span>
        <span className="hidden sm:inline text-xs">{isGhana ? 'GHS' : 'USD'}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-black/10 shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Language Section */}
          <div className="p-3">
            <p className="text-xs font-body text-muted-text uppercase tracking-wider mb-2 flex items-center gap-1">
              <Globe size={12} /> Language
            </p>
            <div className="grid grid-cols-1 gap-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    changeLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 text-left text-sm font-body transition-colors hover:bg-black/5 ${
                    language === lang.code ? 'bg-ashanti-gold/10 text-black font-medium' : 'text-black'
                  }`}
                  data-testid={`lang-option-${lang.code}`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span>{lang.nativeName}</span>
                  {language === lang.code && (
                    <span className="ml-auto text-ashanti-gold">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Location Info - Read Only */}
          <div className="px-3 pb-3 pt-2 border-t border-black/10">
            <p className="text-[10px] text-muted-text text-center">
              {isGhana ? '🇬🇭 Showing prices in Ghana Cedi' : '🌍 Showing prices in US Dollar'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
