import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth, API } from '../App';

const UserActivityContext = createContext(null);

export const useUserActivity = () => {
  const context = useContext(UserActivityContext);
  if (!context) {
    throw new Error('useUserActivity must be used within UserActivityProvider');
  }
  return context;
};

// Check if personalization is allowed
const isPersonalizationAllowed = () => {
  const consent = localStorage.getItem('bst_cookie_consent');
  if (!consent) return true; // Default to true before consent
  try {
    const prefs = JSON.parse(consent);
    return prefs.personalization !== false;
  } catch {
    return true;
  }
};

export const UserActivityProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [categoryPreferences, setCategoryPreferences] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load activity from localStorage on mount
  useEffect(() => {
    if (!isPersonalizationAllowed()) return;
    
    const storedViewed = localStorage.getItem('bst_recently_viewed');
    const storedPrefs = localStorage.getItem('bst_category_prefs');
    
    if (storedViewed) {
      try {
        setRecentlyViewed(JSON.parse(storedViewed));
      } catch (e) {
        console.error('Failed to parse recently viewed:', e);
      }
    }
    
    if (storedPrefs) {
      try {
        setCategoryPreferences(JSON.parse(storedPrefs));
      } catch (e) {
        console.error('Failed to parse category prefs:', e);
      }
    }
  }, []);

  // Sync with server when user logs in
  useEffect(() => {
    if (user && token && isPersonalizationAllowed()) {
      syncActivityWithServer();
      fetchRecommendations();
    }
  }, [user, token]);

  // Track product view
  const trackProductView = useCallback((product) => {
    if (!isPersonalizationAllowed()) return;
    
    const viewedItem = {
      product_id: product.product_id,
      name: product.name,
      category: product.category,
      image: product.images?.[0],
      price: product.price,
      price_ghs: product.price_ghs,
      viewed_at: new Date().toISOString()
    };

    setRecentlyViewed(prev => {
      // Remove if already exists, then add to front
      const filtered = prev.filter(p => p.product_id !== product.product_id);
      const updated = [viewedItem, ...filtered].slice(0, 20); // Keep last 20
      localStorage.setItem('bst_recently_viewed', JSON.stringify(updated));
      return updated;
    });

    // Update category preferences
    if (product.category) {
      setCategoryPreferences(prev => {
        const updated = {
          ...prev,
          [product.category]: (prev[product.category] || 0) + 1
        };
        localStorage.setItem('bst_category_prefs', JSON.stringify(updated));
        return updated;
      });
    }

    // Send to server if logged in
    if (user && token) {
      sendActivityToServer('view', product.product_id, product.category);
    }
  }, [user, token]);

  // Track product click (from listing pages)
  const trackProductClick = useCallback((product) => {
    if (!isPersonalizationAllowed()) return;
    
    // Update category preferences with lower weight
    if (product.category) {
      setCategoryPreferences(prev => {
        const updated = {
          ...prev,
          [product.category]: (prev[product.category] || 0) + 0.5
        };
        localStorage.setItem('bst_category_prefs', JSON.stringify(updated));
        return updated;
      });
    }

    if (user && token) {
      sendActivityToServer('click', product.product_id, product.category);
    }
  }, [user, token]);

  // Track category browse
  const trackCategoryBrowse = useCallback((category) => {
    if (!isPersonalizationAllowed()) return;
    
    setCategoryPreferences(prev => {
      const updated = {
        ...prev,
        [category]: (prev[category] || 0) + 0.3
      };
      localStorage.setItem('bst_category_prefs', JSON.stringify(updated));
      return updated;
    });

    if (user && token) {
      sendActivityToServer('browse', null, category);
    }
  }, [user, token]);

  // Send activity to server
  const sendActivityToServer = async (action, productId, category) => {
    try {
      await axios.post(`${API}/user/activity`, {
        action,
        product_id: productId,
        category
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Failed to send activity:', error);
    }
  };

  // Sync local activity with server on login
  const syncActivityWithServer = async () => {
    try {
      const localViewed = localStorage.getItem('bst_recently_viewed');
      const localPrefs = localStorage.getItem('bst_category_prefs');
      
      await axios.post(`${API}/user/activity/sync`, {
        recently_viewed: localViewed ? JSON.parse(localViewed) : [],
        category_preferences: localPrefs ? JSON.parse(localPrefs) : {}
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Failed to sync activity:', error);
    }
  };

  // Fetch personalized recommendations
  const fetchRecommendations = async () => {
    if (!user || !token) return;
    
    setIsLoading(true);
    try {
      const response = await axios.get(`${API}/user/recommendations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecommendations(response.data);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get top categories based on user preference
  const getTopCategories = useCallback(() => {
    const sorted = Object.entries(categoryPreferences)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cat]) => cat);
    return sorted;
  }, [categoryPreferences]);

  // Clear all activity data
  const clearActivity = useCallback(() => {
    setRecentlyViewed([]);
    setCategoryPreferences({});
    setRecommendations([]);
    localStorage.removeItem('bst_recently_viewed');
    localStorage.removeItem('bst_category_prefs');
  }, []);

  const value = {
    recentlyViewed,
    categoryPreferences,
    recommendations,
    isLoading,
    trackProductView,
    trackProductClick,
    trackCategoryBrowse,
    fetchRecommendations,
    getTopCategories,
    clearActivity,
    isPersonalizationAllowed: isPersonalizationAllowed()
  };

  return (
    <UserActivityContext.Provider value={value}>
      {children}
    </UserActivityContext.Provider>
  );
};

export default UserActivityProvider;
