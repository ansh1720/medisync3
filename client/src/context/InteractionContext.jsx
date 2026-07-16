import { createContext, useContext, useState, useEffect, useMemo } from 'react';

const InteractionContext = createContext();

export const useInteraction = () => {
  const context = useContext(InteractionContext);
  if (!context) {
    throw new Error('useInteraction must be used within an InteractionProvider');
  }
  return context;
};

export const InteractionProvider = ({ children }) => {
  const [userInteractions, setUserInteractions] = useState({
    // Feature usage counts
    diseaseSearch: 0,
    riskAssessment: 0,
    consultations: 0,
    hospitalLocator: 0,
    prescriptions: 0,
    equipmentReadings: 0,
    communityForum: 0,
    healthNews: 0,
    
    // Recent activities
    recentSearches: [],
    recentDiseases: [],
    recentSymptoms: [],
    favoriteFeatures: [],
    
    // User preferences derived from behavior
    preferredFeatures: ['diseaseSearch', 'consultations', 'riskAssessment'],
    healthFocus: 'general', // general, chronic, acute, preventive
    engagementLevel: 'moderate', // low, moderate, high
    
    // Time-based data
    lastVisit: new Date(),
    sessionCount: 0,
    totalTimeSpent: 0,
    
    // Health journey
    onboardingComplete: false,
    primaryConcerns: [],
    healthGoals: [],
    
    // Interaction patterns
    preferredTimeOfDay: 'morning', // morning, afternoon, evening
    deviceUsage: 'desktop', // mobile, tablet, desktop
    featureDiscovery: []
  });

  // Load interaction data from localStorage on mount
  useEffect(() => {
    const savedInteractions = localStorage.getItem('medisync_interactions');
    if (savedInteractions) {
      try {
        const parsedData = JSON.parse(savedInteractions);
        setUserInteractions(prev => ({
          ...prev,
          ...parsedData,
          lastVisit: new Date(parsedData.lastVisit || Date.now())
        }));
      } catch (error) {
        console.error('Error loading interaction data:', error);
      }
    }
  }, []);

  // Save interaction data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('medisync_interactions', JSON.stringify(userInteractions));
  }, [userInteractions]);

  // Track feature usage
  const trackFeatureUsage = (feature, metadata = {}) => {
    setUserInteractions(prev => ({
      ...prev,
      [feature]: (prev[feature] || 0) + 1,
      featureDiscovery: [
        ...prev.featureDiscovery.filter(f => f.feature !== feature),
        { feature, timestamp: new Date(), metadata }
      ].slice(-50) // Keep last 50 interactions
    }));

    // Update preferred features based on usage
    updatePreferredFeatures(feature);
  };

  // Track searches
  const trackSearch = (query, type = 'general', results = []) => {
    setUserInteractions(prev => {
      const newRecentSearches = [
        { query, type, timestamp: new Date(), resultCount: results.length },
        ...prev.recentSearches.filter(s => s.query !== query)
      ].slice(0, 20); // Keep last 20 searches

      return {
        ...prev,
        recentSearches: newRecentSearches,
        diseaseSearch: (prev.diseaseSearch || 0) + 1
      };
    });
  };

  // Track disease interactions
  const trackDiseaseInteraction = (diseaseName, action = 'view') => {
    setUserInteractions(prev => {
      const newRecentDiseases = [
        { name: diseaseName, action, timestamp: new Date() },
        ...prev.recentDiseases.filter(d => d.name !== diseaseName)
      ].slice(0, 15); // Keep last 15 diseases

      return {
        ...prev,
        recentDiseases: newRecentDiseases
      };
    });
  };

  // Track symptoms
  const trackSymptomInteraction = (symptoms) => {
    setUserInteractions(prev => {
      const symptomArray = Array.isArray(symptoms) ? symptoms : [symptoms];
      const newRecentSymptoms = [
        ...symptomArray.map(s => ({ name: s, timestamp: new Date() })),
        ...prev.recentSymptoms
      ].slice(0, 30); // Keep last 30 symptoms

      return {
        ...prev,
        recentSymptoms: newRecentSymptoms
      };
    });
  };

  // Update preferred features based on usage patterns
  const updatePreferredFeatures = (newFeature) => {
    setUserInteractions(prev => {
      const featureUsage = {
        diseaseSearch: prev.diseaseSearch || 0,
        riskAssessment: prev.riskAssessment || 0,
        consultations: prev.consultations || 0,
        hospitalLocator: prev.hospitalLocator || 0,
        prescriptions: prev.prescriptions || 0,
        equipmentReadings: prev.equipmentReadings || 0,
        communityForum: prev.communityForum || 0,
        healthNews: prev.healthNews || 0
      };

      // Sort features by usage count
      const sortedFeatures = Object.entries(featureUsage)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([feature]) => feature);

      return {
        ...prev,
        preferredFeatures: sortedFeatures
      };
    });
  };

  // Set health focus based on interactions
  const setHealthFocus = (focus) => {
    setUserInteractions(prev => ({
      ...prev,
      healthFocus: focus
    }));
  };

  // Add to favorites
  const addToFavorites = (item, type) => {
    setUserInteractions(prev => ({
      ...prev,
      favoriteFeatures: [
        ...prev.favoriteFeatures.filter(f => !(f.item === item && f.type === type)),
        { item, type, timestamp: new Date() }
      ].slice(0, 10) // Keep last 10 favorites
    }));
  };

  // Get personalized recommendations
  const getPersonalizedRecommendations = () => {
    const { 
      preferredFeatures, 
      recentSearches, 
      recentDiseases, 
      healthFocus,
      diseaseSearch,
      riskAssessment,
      consultations 
    } = userInteractions;

    const recommendations = [];

    // Based on search history
    if (recentSearches.length > 0) {
      const lastSearch = recentSearches[0];
      recommendations.push({
        type: 'continue_search',
        title: 'Continue Your Research',
        description: `Explore more about "${lastSearch.query}"`,
        action: () => {},
        priority: 'high'
      });
    }

    // Based on disease views
    if (recentDiseases.length > 0) {
      const lastDisease = recentDiseases[0];
      recommendations.push({
        type: 'related_info',
        title: 'Related Information',
        description: `Learn about conditions similar to ${lastDisease.name}`,
        action: () => {},
        priority: 'medium'
      });
    }

    // Based on feature usage
    if (diseaseSearch > consultations && diseaseSearch > riskAssessment) {
      recommendations.push({
        type: 'feature_suggestion',
        title: 'Book a Consultation',
        description: 'Discuss your health concerns with a professional',
        action: () => {},
        priority: 'medium'
      });
    }

    return recommendations.slice(0, 3); // Return top 3 recommendations
  };

  // Get dynamic dashboard layout
  const getDynamicDashboardLayout = () => {
    const { preferredFeatures, healthFocus, engagementLevel, recentSearches } = userInteractions;

    // Determine which widgets to show prominently
    const primaryWidgets = [];
    const secondaryWidgets = [];

    preferredFeatures.forEach((feature, index) => {
      if (index < 3) {
        primaryWidgets.push(feature);
      } else {
        secondaryWidgets.push(feature);
      }
    });

    return {
      primaryWidgets,
      secondaryWidgets,
      showOnboarding: !userInteractions.onboardingComplete,
      showQuickSearch: recentSearches.length > 0,
      healthFocusTheme: healthFocus
    };
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    setUserInteractions(prev => ({
      ...prev,
      recentSearches: []
    }));
  };

  const value = useMemo(() => ({
    userInteractions,
    trackFeatureUsage,
    trackSearch,
    trackDiseaseInteraction,
    trackSymptomInteraction,
    setHealthFocus,
    addToFavorites,
    getPersonalizedRecommendations,
    getDynamicDashboardLayout,
    updatePreferredFeatures,
    clearRecentSearches
  }), [userInteractions]);

  return (
    <InteractionContext.Provider value={value}>
      {children}
    </InteractionContext.Provider>
  );
};