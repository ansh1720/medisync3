import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import Navbar from '../components/Navbar';
import { useInteraction } from '../context/InteractionContext';
import { diseaseAPI } from '../utils/api';
import toast from 'react-hot-toast';

function EnhancedDiseaseSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const { trackSearch, trackFeatureUsage, trackDiseaseInteraction } = useInteraction();
  const [searchTerm, setSearchTerm] = useState('');
  const [diseases, setDiseases] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    riskLevel: 'all',
    sortBy: 'relevance'
  });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Track page visit
  useEffect(() => {
    trackFeatureUsage('diseaseSearch', { source: 'direct' });
  }, []);

  // Handle initial search from dashboard
  useEffect(() => {
    if (location.state?.initialSearch) {
      const initialSearch = location.state.initialSearch;
      setSearchTerm(initialSearch);
      fetchDiseases(initialSearch, true);
      // Clear the state to prevent re-running on component updates
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchDiseases = async (query = '', isEnhancedSearch = false) => {
    if (!query.trim() && !isEnhancedSearch) {
      setDiseases([]);
      return;
    }

    try {
      setIsLoading(true);
      
      // Track the search
      if (query.trim()) {
        trackSearch(query);
      }
      
      const response = isEnhancedSearch 
        ? await diseaseAPI.enhancedSearch(query)
        : await diseaseAPI.searchDiseases({ query });
      
      const data = response.data;

      if (data.success) {
        setDiseases(data.data || []);
        
        // Track search results
        trackFeatureUsage('diseaseSearch', { 
          query: query, 
          resultsCount: data.data?.length || 0,
          searchType: isEnhancedSearch ? 'enhanced' : 'basic'
        });
      } else {
        toast.error('Search failed');
        setDiseases([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search diseases');
      setDiseases([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSymptomSuggestions = async (symptoms) => {
    if (!symptoms.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await diseaseAPI.symptomAnalysis(symptoms);
      const data = response.data;

      if (data.success && data.data.length > 0) {
        setSuggestions(data.data.slice(0, 5)); // Top 5 suggestions
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Symptom analysis error:', error);
      setSuggestions([]);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      fetchDiseases(searchTerm, true); // Use enhanced search
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Check if it looks like symptoms (comma-separated)
    if (value.includes(',') && value.trim()) {
      fetchSymptomSuggestions(value);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const getRiskLevelColor = (riskScore) => {
    if (riskScore >= 7) return 'text-red-600 bg-red-100';
    if (riskScore >= 4) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getRiskLevelText = (riskScore) => {
    if (riskScore >= 7) return 'High Risk';
    if (riskScore >= 4) return 'Medium Risk';
    return 'Low Risk';
  };

  const filterDiseases = (diseases) => {
    let filtered = [...diseases];

    if (filters.riskLevel !== 'all') {
      filtered = filtered.filter(disease => {
        const riskScore = disease.riskScore || 0;
        switch (filters.riskLevel) {
          case 'low':
            return riskScore < 4;
          case 'medium':
            return riskScore >= 4 && riskScore < 7;
          case 'high':
            return riskScore >= 7;
          default:
            return true;
        }
      });
    }

    // Sort diseases
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'risk':
          return (b.riskScore || 0) - (a.riskScore || 0);
        case 'relevance':
        default:
          return (b.relevanceScore || 0) - (a.relevanceScore || 0);
      }
    });

    return filtered;
  };

  const highlightText = (text, searchTerm) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Disease Information Center
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Search for diseases, symptoms, and get comprehensive health information
          </p>
        </div>

        {/* Search Section */}
        <div className="max-w-4xl mx-auto mb-8">
          <form onSubmit={handleSearch} className="relative">
            <div className="flex">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleInputChange}
                  placeholder="Search diseases or enter symptoms (e.g., fever, headache, fatigue)..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                
                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-b-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    <div className="p-2 bg-blue-50 text-sm text-blue-700 font-medium">
                      Diseases matching your symptoms:
                    </div>
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSearchTerm(suggestion.name);
                          setShowSuggestions(false);
                          fetchDiseases(suggestion.name, true);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{suggestion.name}</div>
                        <div className="text-sm text-gray-600">
                          {suggestion.matchedSymptoms?.length} symptoms match • 
                          <span className={`ml-1 ${getRiskLevelColor(suggestion.riskScore).replace('bg-', 'text-').replace('-100', '-600')}`}>
                            {getRiskLevelText(suggestion.riskScore)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 bg-primary-600 text-white rounded-r-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>

          {/* Search Tips */}
          <div className="mt-4 text-sm text-gray-600">
            <p>
              <strong>Tips:</strong> Search by disease name or enter symptoms separated by commas. 
              Try "diabetes", "heart disease", or "fever, headache, nausea" for symptom-based search.
            </p>
          </div>
        </div>

        {/* Filters */}
        {diseases.length > 0 && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center space-x-4">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Risk Level:</label>
                  <select
                    value={filters.riskLevel}
                    onChange={(e) => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  >
                    <option value="all">All Levels</option>
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Sort by:</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="name">Name</option>
                    <option value="risk">Risk Level</option>
                  </select>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {filterDiseases(diseases).length} results found
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="max-w-4xl mx-auto">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Searching diseases...</p>
            </div>
          ) : diseases.length > 0 ? (
            <div className="space-y-4">
              {filterDiseases(diseases).map((disease, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          <Link
                            to={`/diseases/details/${encodeURIComponent(disease.name)}`}
                            className="hover:text-primary-600 transition-colors"
                            dangerouslySetInnerHTML={{ __html: highlightText(disease.name, searchTerm) }}
                          />
                        </h3>
                        
                        <div className="flex items-center space-x-4 mb-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(disease.riskScore)}`}>
                            {getRiskLevelText(disease.riskScore)}
                          </span>
                          {disease.relevanceScore && (
                            <span className="text-xs text-gray-500">
                              Relevance: {Math.round(disease.relevanceScore)}%
                            </span>
                          )}
                          {disease.source && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                              {disease.source === 'database' ? 'Database' : 'CSV Data'}
                            </span>
                          )}
                        </div>

                        {disease.overview && (
                          <p className="text-gray-700 mb-4 line-clamp-3">
                            {disease.overview.length > 200 
                              ? `${disease.overview.substring(0, 200)}...`
                              : disease.overview
                            }
                          </p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          {disease.symptoms && disease.symptoms.length > 0 && (
                            <div className="flex items-start space-x-2">
                              <ExclamationTriangleIcon className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-medium text-gray-900">Symptoms:</span>
                                <p className="text-gray-600 mt-1">
                                  {disease.symptoms.slice(0, 3).join(', ')}
                                  {disease.symptoms.length > 3 && ` +${disease.symptoms.length - 3} more`}
                                </p>
                              </div>
                            </div>
                          )}

                          {disease.cause && (
                            <div className="flex items-start space-x-2">
                              <InformationCircleIcon className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-medium text-gray-900">Cause:</span>
                                <p className="text-gray-600 mt-1 line-clamp-2">
                                  {disease.cause.length > 100 
                                    ? `${disease.cause.substring(0, 100)}...`
                                    : disease.cause
                                  }
                                </p>
                              </div>
                            </div>
                          )}

                          {disease.prevention && (
                            <div className="flex items-start space-x-2">
                              <HeartIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-medium text-gray-900">Prevention:</span>
                                <p className="text-gray-600 mt-1 line-clamp-2">
                                  {disease.prevention.length > 100 
                                    ? `${disease.prevention.substring(0, 100)}...`
                                    : disease.prevention
                                  }
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {disease.matchedSymptoms && disease.matchedSymptoms.length > 0 && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <span className="text-sm font-medium text-blue-900">
                              Matched Symptoms: 
                            </span>
                            <span className="text-sm text-blue-700 ml-1">
                              {disease.matchedSymptoms.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="ml-4 flex flex-col items-end space-y-2">
                        <Link
                          to={`/diseases/details/${encodeURIComponent(disease.name)}`}
                          onClick={() => trackDiseaseInteraction('view', disease.name)}
                          className="inline-flex items-center space-x-1 text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          <ChartBarIcon className="h-4 w-4" />
                          <span>View Details</span>
                        </Link>
                        <div className="text-right text-xs text-gray-500">
                          Risk: {disease.riskScore}/10
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchTerm && !isLoading ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No diseases found</h3>
                <p className="text-gray-600">
                  Try searching with different terms or check your spelling. 
                  You can also try symptom-based search by entering symptoms separated by commas.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Search for Disease Information</h3>
                <p className="text-gray-600">
                  Enter a disease name or symptoms to get comprehensive health information, 
                  including causes, prevention methods, and risk assessments.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EnhancedDiseaseSearch;