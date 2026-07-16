import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  HeartIcon,
  ChartBarIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Doughnut, Radar } from 'react-chartjs-2';
import Navbar from '../components/Navbar';
import { diseaseAPI } from '../utils/api';
import toast from 'react-hot-toast';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler
);

function EnhancedDiseaseDetails() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [disease, setDisease] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (name) {
      fetchDiseaseDetails(name);
    }
  }, [name]);

  const fetchDiseaseDetails = async (diseaseName) => {
    try {
      setIsLoading(true);
      
      const response = await diseaseAPI.getDiseaseByName(diseaseName);
      
      if (response.data && response.data.success) {
        setDisease(response.data.data);
      } else {
        toast.error('Disease not found');
        navigate('/diseases');
      }
    } catch (error) {
      console.error('Error fetching disease details:', error);
      toast.error('Failed to load disease details');
      navigate('/diseases');
    } finally {
      setIsLoading(false);
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

  const formatChartData = (chartConfig) => {
    if (!chartConfig || !chartConfig.data) return null;

    switch (chartConfig.type) {
      case 'bar':
        return {
          labels: chartConfig.data.map(item => item.label),
          datasets: [{
            label: 'Frequency (%)',
            data: chartConfig.data.map(item => item.value),
            backgroundColor: chartConfig.data.map(item => item.color),
            borderColor: chartConfig.data.map(item => item.color),
            borderWidth: 1,
            borderRadius: 4
          }]
        };
      
      case 'doughnut':
        return {
          labels: chartConfig.data.map(item => item.label),
          datasets: [{
            data: chartConfig.data.map(item => item.value),
            backgroundColor: chartConfig.data.map(item => item.color),
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        };
      
      case 'radar':
        return {
          labels: chartConfig.data.map(item => item.label),
          datasets: [{
            label: 'Prevention Methods',
            data: chartConfig.data.map(item => item.value),
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderColor: 'rgba(59, 130, 246, 1)',
            pointBackgroundColor: 'rgba(59, 130, 246, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(59, 130, 246, 1)'
          }]
        };
      
      default:
        return null;
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        cornerRadius: 8
      }
    }
  };

  const radarOptions = {
    ...chartOptions,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (!disease) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Disease Not Found</h2>
            <button
              onClick={() => navigate('/diseases')}
              className="text-primary-600 hover:text-primary-700"
            >
              Back to Disease Search
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>Back</span>
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{disease.name}</h1>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskLevelColor(disease.riskScore)}`}>
                  {getRiskLevelText(disease.riskScore)}
                </span>
                <span className="text-gray-500 text-sm">Risk Score: {disease.riskScore}/10</span>
                {disease.source && (
                  <span className="text-blue-600 text-sm bg-blue-100 px-2 py-1 rounded">
                    Source: {disease.source === 'database' ? 'Database' : 'CSV Data'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'symptoms', 'prevention', 'analytics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Overview */}
              {disease.overview && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <InformationCircleIcon className="h-6 w-6 text-blue-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Overview</h2>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{disease.overview}</p>
                </div>
              )}

              {/* Cause */}
              {disease.cause && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Causes</h2>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{disease.cause}</p>
                </div>
              )}

              {/* Treatment */}
              {disease.treatment && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <HeartIcon className="h-6 w-6 text-red-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Treatment</h2>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{disease.treatment}</p>
                </div>
              )}

              {/* Why it Matters */}
              {disease.importance && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <ExclamationTriangleIcon className="h-6 w-6 text-purple-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Why It Matters</h2>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{disease.importance}</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Risk Assessment */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Assessment</h3>
                {disease.chartData?.risk && (
                  <div className="h-48">
                    <Doughnut
                      data={formatChartData(disease.chartData.risk)}
                      options={chartOptions}
                    />
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Risk Level:</span>
                    <span className={`font-medium ${getRiskLevelColor(disease.riskScore).replace('bg-', 'text-').replace('-100', '-600')}`}>
                      {getRiskLevelText(disease.riskScore)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Symptoms:</span>
                    <span className="font-medium">{disease.symptoms?.length || 0}</span>
                  </div>
                  {disease.preventionMethods && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Prevention Methods:</span>
                      <span className="font-medium">
                        {Object.values(disease.preventionMethods).flat().length}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'symptoms' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Symptoms List */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Common Symptoms</h2>
              {disease.symptoms && disease.symptoms.length > 0 ? (
                <div className="space-y-3">
                  {disease.symptoms.map((symptom, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                      <span className="text-gray-800">{symptom}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No specific symptoms information available.</p>
              )}
            </div>

            {/* Symptoms Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Symptom Frequency</h2>
              {disease.chartData?.symptoms ? (
                <div className="h-64">
                  <Bar
                    data={formatChartData(disease.chartData.symptoms)}
                    options={chartOptions}
                  />
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <p>No chart data available</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'prevention' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Prevention Information */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center space-x-2 mb-6">
                <ShieldCheckIcon className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Prevention Methods</h2>
              </div>
              {disease.prevention ? (
                <p className="text-gray-700 leading-relaxed">{disease.prevention}</p>
              ) : (
                <p className="text-gray-500 italic">No prevention information available.</p>
              )}
            </div>

            {/* Prevention Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Prevention Categories</h2>
              {disease.chartData?.prevention ? (
                <div className="h-64">
                  <Radar
                    data={formatChartData(disease.chartData.prevention)}
                    options={radarOptions}
                  />
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <p>No chart data available</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* All Charts */}
            {disease.chartData && (
              <>
                {disease.chartData.symptoms && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Symptom Analysis</h3>
                    <div className="h-48">
                      <Bar
                        data={formatChartData(disease.chartData.symptoms)}
                        options={chartOptions}
                      />
                    </div>
                  </div>
                )}

                {disease.chartData.risk && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Assessment</h3>
                    <div className="h-48">
                      <Doughnut
                        data={formatChartData(disease.chartData.risk)}
                        options={chartOptions}
                      />
                    </div>
                  </div>
                )}

                {disease.chartData.prevention && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Prevention Strategies</h3>
                    <div className="h-48">
                      <Radar
                        data={formatChartData(disease.chartData.prevention)}
                        options={radarOptions}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EnhancedDiseaseDetails;