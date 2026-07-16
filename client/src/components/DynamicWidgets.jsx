import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChartBarIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  HeartIcon,
  UserGroupIcon,
  NewspaperIcon,
  BuildingOffice2Icon,
  BeakerIcon,
  ClockIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  EyeIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline';
import { useInteraction } from '../context/InteractionContext';

// Quick Search Widget - adapts based on search history
export const QuickSearchWidget = () => {
  const navigate = useNavigate();
  const { userInteractions, trackSearch } = useInteraction();
  const [searchQuery, setSearchQuery] = useState('');

  const recentSearches = userInteractions.recentSearches.slice(0, 3);
  const popularSymptoms = ['fever', 'headache', 'cough', 'fatigue'];

  const handleQuickSearch = (query) => {
    trackSearch(query, 'quick');
    // Navigate to disease search with query
    navigate('/diseases', { state: { initialSearch: query } });
  };

  return (
    <div className="bg-card rounded-xl shadow-lg p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-card-foreground flex items-center">
          <MagnifyingGlassIcon className="h-5 w-5 mr-2 text-primary" />
          Quick Health Search
        </h3>
        <Link to="/diseases" className="text-sm text-primary hover:text-primary/80">
          Advanced Search
        </Link>
      </div>

      {/* Search input */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleQuickSearch(searchQuery)}
          placeholder="Search symptoms, diseases..."
          className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
        />
      </div>

      {/* Recent searches */}
      {recentSearches.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-muted-foreground mb-2">Recent Searches</p>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => handleQuickSearch(search.query)}
                className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm hover:bg-primary/20 transition-colors"
              >
                {search.query}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Popular symptoms */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Common Symptoms</p>
        <div className="grid grid-cols-2 gap-2">
          {popularSymptoms.map((symptom) => (
            <button
              key={symptom}
              onClick={() => handleQuickSearch(symptom)}
              className="px-3 py-2 text-left bg-muted text-muted-foreground rounded-lg text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {symptom}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Personalized Quick Actions Widget
export const PersonalizedActionsWidget = () => {
  const { userInteractions, trackFeatureUsage } = useInteraction();
  
  const getPersonalizedActions = () => {
    const { preferredFeatures, recentDiseases, consultations } = userInteractions;
    
    const actions = [
      {
        id: 'diseaseSearch',
        title: 'Disease Search',
        description: 'Find health information',
        icon: MagnifyingGlassIcon,
        color: 'blue',
        href: '/diseases',
        usage: userInteractions.diseaseSearch || 0
      },
      {
        id: 'consultations',
        title: 'Consultations',
        description: 'Book or manage appointments',
        icon: CalendarDaysIcon,
        color: 'green',
        href: '/consultations',
        usage: userInteractions.consultations || 0
      },
      {
        id: 'riskAssessment',
        title: 'Risk Assessment',
        description: 'Check health risks',
        icon: ChartBarIcon,
        color: 'orange',
        href: '/risk-assessment',
        usage: userInteractions.riskAssessment || 0
      },
      {
        id: 'hospitalLocator',
        title: 'Find Hospitals',
        description: 'Locate nearby healthcare',
        icon: BuildingOffice2Icon,
        color: 'indigo',
        href: '/hospitals',
        usage: userInteractions.hospitalLocator || 0
      },
      {
        id: 'equipmentReadings',
        title: 'Health Readings',
        description: 'Track vital signs',
        icon: BeakerIcon,
        color: 'red',
        href: '/equipment',
        usage: userInteractions.equipmentReadings || 0
      }
    ];

    // Sort by usage and return top 4
    return actions
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 4);
  };

  const personalizedActions = getPersonalizedActions();

  return (
    <div className="bg-card rounded-xl shadow-lg p-6 border border-border">
      <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
        <StarIcon className="h-5 w-5 mr-2 text-warning" />
        Your Most Used Features
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        {personalizedActions.map((action) => {
          const IconComponent = action.icon;
          return (
            <Link
              key={action.id}
              to={action.href}
              onClick={() => trackFeatureUsage(action.id)}
              className={`p-4 rounded-lg border-2 border-${action.color}-200 bg-${action.color}-50 hover:bg-${action.color}-100 transition-all duration-200 group`}
            >
              <div className="flex items-center mb-2">
                <IconComponent className={`h-5 w-5 text-${action.color}-600 mr-2`} />
                <span className="text-sm font-medium text-card-foreground">{action.title}</span>
              </div>
              <p className="text-xs text-muted-foreground">{action.description}</p>
              {action.usage > 0 && (
                <div className="mt-2 flex items-center">
                  <ArrowTrendingUpIcon className="h-3 w-3 text-muted-foreground mr-1" />
                  <span className="text-xs text-muted-foreground">Used {action.usage} times</span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

// Recent Health Activity Widget
export const RecentHealthActivityWidget = () => {
  const { userInteractions } = useInteraction();
  
  const getRecentActivities = () => {
    const activities = [];
    
    // Recent searches
    userInteractions.recentSearches.slice(0, 2).forEach(search => {
      activities.push({
        type: 'search',
        title: `Searched for "${search.query}"`,
        time: search.timestamp,
        icon: MagnifyingGlassIcon,
        color: 'blue'
      });
    });

    // Recent diseases viewed
    userInteractions.recentDiseases.slice(0, 2).forEach(disease => {
      activities.push({
        type: 'disease',
        title: `Viewed ${disease.name}`,
        time: disease.timestamp,
        icon: EyeIcon,
        color: 'green'
      });
    });

    // Recent feature usage
    userInteractions.featureDiscovery.slice(0, 2).forEach(feature => {
      activities.push({
        type: 'feature',
        title: `Used ${feature.feature}`,
        time: feature.timestamp,
        icon: StarIcon,
        color: 'purple'
      });
    });

    return activities
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 4);
  };

  const recentActivities = getRecentActivities();

  const formatTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="bg-card rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
        <ClockIcon className="h-5 w-5 mr-2 text-muted-foreground" />
        Recent Activity
      </h3>
      
      {recentActivities.length > 0 ? (
        <div className="space-y-3">
          {recentActivities.map((activity, index) => {
            const IconComponent = activity.icon;
            return (
              <div key={index} className="flex items-center p-3 bg-muted rounded-lg">
                <IconComponent className={`h-4 w-4 text-${activity.color}-600${activity.color}-400 mr-3 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate">
                    {activity.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatTime(activity.time)}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <ClockIcon className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No recent activity</p>
          <p className="text-sm text-muted-foreground">Start exploring to see your activity here</p>
        </div>
      )}
    </div>
  );
};

// Health Insights Widget
export const HealthInsightsWidget = () => {
  const { userInteractions, getPersonalizedRecommendations } = useInteraction();
  
  const recommendations = getPersonalizedRecommendations();
  const { healthFocus, recentSymptoms, recentDiseases } = userInteractions;

  const getHealthFocusColor = (focus) => {
    switch (focus) {
      case 'chronic': return 'orange';
      case 'acute': return 'red';
      case 'preventive': return 'green';
      default: return 'blue';
    }
  };

  const getInsights = () => {
    const insights = [];

    if (recentSymptoms.length > 0) {
      const symptomCounts = {};
      recentSymptoms.forEach(s => {
        symptomCounts[s.name] = (symptomCounts[s.name] || 0) + 1;
      });
      
      const topSymptom = Object.entries(symptomCounts).sort(([,a], [,b]) => b - a)[0];
      if (topSymptom) {
        insights.push({
          title: 'Most Searched Symptom',
          description: `You've searched for "${topSymptom[0]}" ${topSymptom[1]} times`,
          type: 'symptom'
        });
      }
    }

    if (recentDiseases.length > 0) {
      insights.push({
        title: 'Recent Health Research',
        description: `Last viewed: ${recentDiseases[0].name}`,
        type: 'disease'
      });
    }

    return insights;
  };

  const insights = getInsights();

  return (
    <div className="bg-card rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
        <HeartIcon className={`h-5 w-5 mr-2 text-${getHealthFocusColor(healthFocus)}-600${getHealthFocusColor(healthFocus)}-400`} />
        Health Insights
      </h3>

      {/* Health Focus */}
      <div className="mb-4 p-3 bg-muted rounded-lg">
        <p className="text-sm font-medium text-muted-foreground">Health Focus</p>
        <p className={`text-lg font-semibold text-${getHealthFocusColor(healthFocus)}-600${getHealthFocusColor(healthFocus)}-400 capitalize`}>
          {healthFocus} Health
        </p>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div key={index} className="p-3 border border-gray-200 rounded-lg">
              <p className="text-sm font-medium text-card-foreground">{insight.title}</p>
              <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-muted-foreground mb-2">Recommendations</p>
          <div className="space-y-2">
            {recommendations.map((rec, index) => (
              <div key={index} className={`p-2 bg-${rec.priority === 'high' ? 'blue' : 'gray'}-50${rec.priority === 'high' ? 'blue' : 'gray'}-800/30 rounded text-sm`}>
                <p className="font-medium text-card-foreground">{rec.title}</p>
                <p className="text-gray-600 text-xs">{rec.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Smart Feature Discovery Widget
export const FeatureDiscoveryWidget = () => {
  const { userInteractions, trackFeatureUsage } = useInteraction();
  
  const getAllFeatures = () => [
    { id: 'diseaseSearch', name: 'Disease Search', description: 'Research health conditions' },
    { id: 'consultations', name: 'Consultations', description: 'Book doctor appointments' },
    { id: 'riskAssessment', name: 'Risk Assessment', description: 'Evaluate health risks' },
    { id: 'hospitalLocator', name: 'Hospital Locator', description: 'Find nearby hospitals' },
    { id: 'equipmentReadings', name: 'Vital Signs', description: 'Track health metrics' },
    { id: 'communityForum', name: 'Community', description: 'Connect with others' },
    { id: 'healthNews', name: 'Health News', description: 'Stay informed' }
  ];

  const getUnexploredFeatures = () => {
    const allFeatures = getAllFeatures();
    const usedFeatures = Object.keys(userInteractions)
      .filter(key => userInteractions[key] > 0)
      .filter(key => allFeatures.some(f => f.id === key));
    
    return allFeatures
      .filter(feature => !usedFeatures.includes(feature.id))
      .slice(0, 3);
  };

  const unexploredFeatures = getUnexploredFeatures();

  if (unexploredFeatures.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl shadow-lg p-6 border border-primary/20">
      <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
        <StarIcon className="h-5 w-5 mr-2 text-primary" />
        Discover New Features
      </h3>
      
      <div className="space-y-3">
        {unexploredFeatures.map((feature) => (
          <div 
            key={feature.id}
            className="p-3 bg-card rounded-lg border border-purple-200 hover:border-primary/40 transition-colors cursor-pointer"
            onClick={() => trackFeatureUsage(feature.id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-card-foreground">{feature.name}</p>
                <p className="text-xs text-gray-600">{feature.description}</p>
              </div>
              <div className="bg-purple-100 text-primary px-2 py-1 rounded text-xs font-medium">
                New
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
