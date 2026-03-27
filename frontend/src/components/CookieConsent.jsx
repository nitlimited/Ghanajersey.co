import { useState, useEffect } from 'react';
import { X, Cookie, Settings, Bell } from 'lucide-react';
import { Button } from '../components/ui/button';

const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true, // Always required
    analytics: true,
    marketing: true,
    personalization: true
  });

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem('bst_cookie_consent');
    if (!consent) {
      // Small delay for better UX
      setTimeout(() => setShowBanner(true), 1000);
    }
  }, []);

  const handleAcceptAll = () => {
    const allConsent = {
      essential: true,
      analytics: true,
      marketing: true,
      personalization: true,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('bst_cookie_consent', JSON.stringify(allConsent));
    setShowBanner(false);
  };

  const handleSavePreferences = () => {
    const consent = {
      ...preferences,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('bst_cookie_consent', JSON.stringify(consent));
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleManageCookies = () => {
    setShowSettings(true);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Cookie Banner */}
      {!showSettings && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-black text-white p-4 md:p-6 shadow-2xl animate-in slide-in-from-bottom duration-500">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex-shrink-0">
                <Cookie size={32} className="text-ashanti-gold" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading text-lg mb-2 tracking-wide">COOKIE NOTICE</h3>
                <p className="font-body text-sm text-white/80 leading-relaxed">
                  This site uses cookies and other technologies, some of which are provided by third parties, to collect user information and activity in order to personalize the experience, perform marketing, and collect analytics. Click on "Manage Cookies" to learn more or opt out of non-essential cookies. By using this site, closing this message or clicking "Manage Cookies" or "OK" you acknowledge and agree to our{' '}
                  <a href="/privacy" className="text-ashanti-gold underline hover:text-white transition-colors">Privacy Policy</a>
                  {' '}and{' '}
                  <a href="/terms" className="text-ashanti-gold underline hover:text-white transition-colors">Terms & Conditions</a>.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <Button
                  onClick={handleManageCookies}
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-black font-body text-sm px-6"
                  data-testid="manage-cookies-btn"
                >
                  <Settings size={16} className="mr-2" />
                  Manage Cookies
                </Button>
                <Button
                  onClick={handleAcceptAll}
                  className="bg-ashanti-gold text-black hover:bg-white font-body text-sm px-8"
                  data-testid="accept-cookies-btn"
                >
                  OK
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cookie Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
            <div className="sticky top-0 bg-black text-white p-4 flex items-center justify-between">
              <h2 className="font-heading text-xl tracking-wide">COOKIE PREFERENCES</h2>
              <button onClick={() => setShowSettings(false)} className="hover:text-ashanti-gold transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <p className="font-body text-sm text-muted-text">
                We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. Choose which cookies you allow us to use.
              </p>

              {/* Essential Cookies */}
              <div className="border border-black/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-heading text-sm tracking-wider">ESSENTIAL COOKIES</h3>
                  <span className="font-body text-xs bg-black text-white px-2 py-1">REQUIRED</span>
                </div>
                <p className="font-body text-xs text-muted-text">
                  These cookies are necessary for the website to function and cannot be switched off. They are usually set in response to actions made by you such as setting your privacy preferences, logging in, or filling in forms.
                </p>
              </div>

              {/* Analytics Cookies */}
              <div className="border border-black/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-heading text-sm tracking-wider">ANALYTICS COOKIES</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => setPreferences({...preferences, analytics: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-checked:bg-ashanti-gold rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>
                <p className="font-body text-xs text-muted-text">
                  These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us know which pages are the most and least popular.
                </p>
              </div>

              {/* Marketing Cookies */}
              <div className="border border-black/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-heading text-sm tracking-wider">MARKETING COOKIES</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) => setPreferences({...preferences, marketing: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-checked:bg-ashanti-gold rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>
                <p className="font-body text-xs text-muted-text">
                  These cookies may be set through our site by our advertising partners. They may be used to build a profile of your interests and show you relevant adverts on other sites.
                </p>
              </div>

              {/* Personalization Cookies */}
              <div className="border border-black/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-heading text-sm tracking-wider">PERSONALIZATION COOKIES</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.personalization}
                      onChange={(e) => setPreferences({...preferences, personalization: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-checked:bg-ashanti-gold rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>
                <p className="font-body text-xs text-muted-text">
                  These cookies enable us to provide personalized content based on your browsing history, recently viewed products, and preferences. This helps us show you jerseys you might be interested in.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  onClick={handleSavePreferences}
                  className="flex-1 bg-black hover:bg-ashanti-gold hover:text-black font-body"
                  data-testid="save-cookie-prefs-btn"
                >
                  Save Preferences
                </Button>
                <Button
                  onClick={handleAcceptAll}
                  variant="outline"
                  className="flex-1 border-black font-body"
                >
                  Accept All
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CookieConsent;
