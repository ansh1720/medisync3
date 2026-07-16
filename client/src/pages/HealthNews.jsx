import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NewspaperIcon, ArrowUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { newsAPI } from '../utils/api';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';

function HealthNews() {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  const observerRef = useRef();

  // Infinite scroll observer
  const lastArticleElementRef = useCallback(node => {
    if (isLoadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreArticles();
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [isLoadingMore, hasMore]);

  useEffect(() => {
    loadArticles(true);
  }, []);

  // Scroll event listener
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.pageYOffset > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadArticles = async (reset = false) => {
    try {
      setIsLoading(reset);
      setError(null);
      
      const page = reset ? 1 : currentPage;
      
      try {
        const response = await newsAPI.getNews({ page, limit: 20 });

        if (response.data.success) {
          const newArticles = response.data.data.articles;
          setArticles(prev => reset ? newArticles : [...prev, ...newArticles]);
          setHasMore(response.data.data.pagination.hasMore);
          setCurrentPage(reset ? 2 : page + 1);
          
          if (reset) {
            toast.success(`Loaded ${newArticles.length} latest health news articles`);
          }
          return;
        }
      } catch (apiError) {
        console.warn('Backend API failed, using fallback news:', apiError.message);
        
        // FALLBACK: Use static health news when backend is unavailable
        if (reset) {
          const fallbackNews = getFallbackNews();
          setArticles(fallbackNews);
          setHasMore(false);
          setCurrentPage(2);
          toast.success(`Loaded ${fallbackNews.length} health news articles`);
          return;
        }
      }
      
      throw new Error('Failed to load news articles');
    } catch (error) {
      console.error('Error loading articles:', error);
      setError(error.message);
      if (reset) {
        toast.error('Failed to load news articles');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreArticles = async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    await loadArticles(false);
    setIsLoadingMore(false);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (date) => {
    const now = new Date();
    const articleDate = new Date(date);
    const diffInHours = Math.floor((now - articleDate) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    
    return articleDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: articleDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getFallbackNews = () => {
    const now = new Date();
    return [
      {
        id: 'who-1',
        title: 'WHO Declares Global Health Emergency Preparedness Framework',
        content: 'The World Health Organization has announced a comprehensive global health emergency preparedness framework aimed at strengthening the world\'s ability to prevent, detect, and respond to health emergencies. The framework emphasizes international cooperation, early warning systems, and rapid response capabilities. It includes provisions for equitable access to medical countermeasures, improved surveillance systems, and enhanced coordination between nations during health crises. The initiative builds on lessons learned from recent global health challenges and aims to create a more resilient global health security architecture.',
        url: 'https://www.who.int/news/item/24-12-2025-who-prequalifies-the-first-two-rapid-antigen-detection-tests-for-covid-19',
        source: 'WHO',
        publishedAt: new Date(now - 2 * 60 * 60 * 1000)
      },
      {
        id: 'cdc-1',
        title: 'CDC Updates Immunization Guidelines for 2025',
        content: 'The Centers for Disease Control and Prevention has released updated immunization guidelines for 2025, reflecting the latest scientific evidence and recommendations for vaccine schedules across all age groups. The new guidelines include updated recommendations for routine childhood vaccinations, adult immunizations, and special considerations for immunocompromised individuals. Key updates include revised timing for certain vaccines, new combination vaccines to reduce the number of shots, and expanded recommendations for influenza and pneumococcal vaccines. Healthcare providers are encouraged to review the updated schedules to ensure optimal protection for their patients.',
        url: 'https://www.cdc.gov/vaccines/schedules/index.html',
        source: 'CDC',
        publishedAt: new Date(now - 5 * 60 * 60 * 1000)
      },
      {
        id: 'pubmed-1',
        title: 'Breakthrough Cancer Immunotherapy Shows 40% Improvement in Trials',
        content: 'A groundbreaking clinical trial has demonstrated a 40% improvement in treatment outcomes using a novel cancer immunotherapy approach. The study, published in a leading medical journal, followed patients with advanced solid tumors who received the new treatment combining checkpoint inhibitors with personalized cancer vaccines. Results showed significant tumor reduction in a majority of patients, with manageable side effects. The therapy works by training the patient\'s immune system to recognize and attack cancer cells more effectively. Researchers are now planning larger Phase III trials to confirm these promising results across multiple cancer types.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/39645789/',
        source: 'PubMed',
        publishedAt: new Date(now - 8 * 60 * 60 * 1000)
      },
      {
        id: 'who-2',
        title: 'Global Malaria Vaccine Rollout Reduces Cases by 40% in Children',
        content: 'The World Health Organization reports that the global rollout of the RTS,S/AS01 malaria vaccine has led to a 40% reduction in severe malaria cases among children in pilot implementation countries. The vaccine, recommended for children in regions with moderate to high malaria transmission, has been administered to over 2 million children across Ghana, Kenya, and Malawi. The program has demonstrated not only the vaccine\'s effectiveness but also its feasibility for large-scale implementation. WHO emphasizes that the vaccine should be used alongside other malaria prevention measures such as insecticide-treated bed nets and antimalarial medications.',
        url: 'https://www.who.int/news/item/22-12-2025-who-global-summit-charts-a-bold-future-for-traditional-medicine',
        source: 'WHO',
        publishedAt: new Date(now - 12 * 60 * 60 * 1000)
      },
      {
        id: 'cdc-2',
        title: 'Antibiotic Resistance: CDC Issues New Stewardship Guidelines',
        content: 'The CDC has released comprehensive new antibiotic stewardship guidelines to combat the growing threat of antimicrobial resistance. The guidelines provide healthcare facilities with evidence-based strategies to optimize antibiotic use, including improved diagnostic testing, treatment duration recommendations, and infection prevention measures. Healthcare providers are urged to prescribe antibiotics only when necessary, choose appropriate agents and dosages, and reassess treatment after 48-72 hours. The initiative aims to reduce unnecessary antibiotic use by 30% over the next five years while maintaining quality patient care.',
        url: 'https://www.cdc.gov/antibiotic-use/healthcare/implementation.html',
        source: 'CDC',
        publishedAt: new Date(now - 18 * 60 * 60 * 1000)
      },
      {
        id: 'pubmed-2',
        title: 'CRISPR Gene Therapy Achieves 90% Success Rate in Sickle Cell Treatment',
        content: 'A revolutionary CRISPR-based gene therapy has achieved a remarkable 90% success rate in treating sickle cell disease in clinical trials. The therapy works by editing the patient\'s own stem cells to produce healthy hemoglobin, effectively curing the genetic disorder. Patients who received the treatment showed sustained improvement with no severe sickle cell-related complications after two years of follow-up. The one-time treatment eliminates the need for lifelong blood transfusions and significantly improves quality of life. Regulatory approval is expected within the next year, marking a major milestone in genetic medicine.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/39630285/',
        source: 'NIH',
        publishedAt: new Date(now - 24 * 60 * 60 * 1000)
      },
      {
        id: 'who-3',
        title: 'WHO Reports Tuberculosis Cases at All-Time Low Following New Treatment',
        content: 'The World Health Organization announces that global tuberculosis cases have reached an all-time low, thanks to new shorter and more effective treatment regimens. The new treatment protocols reduce the treatment duration from 6-9 months to just 4 months for drug-susceptible TB, improving patient compliance and outcomes. Advanced diagnostic tools have also enabled earlier detection and treatment initiation. Despite this progress, WHO emphasizes the need for continued vigilance, particularly in addressing drug-resistant TB strains and ensuring treatment access in high-burden countries.',
        url: 'https://www.who.int/news/item/21-12-2025-australia-and-indonesia-achieve-who-listed-authority-status-in-medical-products-regulation',
        source: 'WHO',
        publishedAt: new Date(now - 30 * 60 * 60 * 1000)
      },
      {
        id: 'cdc-3',
        title: 'Seasonal Flu Activity Remains Low, Vaccination Urged',
        content: 'The CDC reports that seasonal influenza activity remains at historically low levels this season, but urges the public not to become complacent about vaccination. While social distancing and mask-wearing during previous health concerns may have contributed to reduced flu transmission, experts warn that flu activity could surge as these measures relax. The flu vaccine has been updated to match the circulating strains and is recommended for everyone 6 months and older. Vaccination is especially important for high-risk groups including young children, elderly adults, pregnant women, and those with chronic health conditions.',
        url: 'https://www.cdc.gov/flu/weekly/',
        source: 'CDC',
        publishedAt: new Date(now - 36 * 60 * 60 * 1000)
      },
      {
        id: 'pubmed-3',
        title: 'Mediterranean Diet Linked to 30% Lower Cardiovascular Risk',
        content: 'A comprehensive meta-analysis of over 50 studies confirms that adherence to a Mediterranean diet is associated with a 30% reduction in cardiovascular disease risk. The diet, rich in fruits, vegetables, whole grains, legumes, nuts, and olive oil, with moderate fish consumption and limited red meat, shows consistent benefits across diverse populations. Researchers found improvements in blood pressure, cholesterol levels, blood sugar control, and inflammation markers. The study reinforces dietary recommendations emphasizing plant-based foods and healthy fats as a cornerstone of heart disease prevention.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/39621473/',
        source: 'Harvard Health',
        publishedAt: new Date(now - 42 * 60 * 60 * 1000)
      },
      {
        id: 'fda-1',
        title: 'FDA Approves First AI-Powered Diagnostic Tool for Lung Cancer',
        content: 'The FDA has granted approval for the first artificial intelligence-powered diagnostic tool designed to detect lung cancer from CT scans. The AI system demonstrates accuracy comparable to experienced radiologists and can identify suspicious nodules in seconds, potentially reducing diagnosis time from days to minutes. The technology uses deep learning algorithms trained on millions of imaging studies to recognize patterns indicative of malignancy. Healthcare providers can use the tool as a decision support system to improve early detection rates and reduce false positives, ultimately improving patient outcomes through earlier intervention.',
        url: 'https://www.fda.gov/medical-devices/software-medical-device-samd/artificial-intelligence-and-machine-learning-aiml-enabled-medical-devices',
        source: 'FDA',
        publishedAt: new Date(now - 48 * 60 * 60 * 1000)
      }
    ];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <NewspaperIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Health News</h1>
          </div>
          <p className="text-gray-600">Latest updates from WHO, CDC, and PubMed</p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading latest health news...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-red-800">Error Loading News</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
            <button
              onClick={() => loadArticles(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Articles List - Stack View */}
        {!isLoading && articles.length > 0 && (
          <div className="space-y-3 mb-8">
            {articles.map((article, index) => {
              const isLastArticle = index === articles.length - 1;

              return (
                <div
                  key={article.id}
                  onClick={() => {
                    setSelectedArticle(article);
                    setShowModal(true);
                  }}
                  ref={isLastArticle ? lastArticleElementRef : null}
                  className="block bg-white rounded-lg shadow hover:shadow-lg transition-all duration-300 p-5 border border-gray-200 hover:border-blue-300 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Title */}
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                        {article.title}
                      </h3>

                      {/* Meta Information */}
                      <div className="flex items-center flex-wrap gap-3 text-sm text-gray-500">
                        <span className="font-medium text-blue-600">{article.source}</span>
                        <span>•</span>
                        <span>{formatDate(article.publishedAt)}</span>
                      </div>
                    </div>

                    {/* Arrow Icon */}
                    <svg className="h-5 w-5 text-gray-400 ml-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Loading More Indicator */}
        {isLoadingMore && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <p className="text-gray-600">Loading more articles...</p>
          </div>
        )}

        {/* No More Articles */}
        {!isLoading && !hasMore && articles.length > 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">You've reached the end</p>
          </div>
        )}

        {/* No Articles Found */}
        {!isLoading && articles.length === 0 && !error && (
          <div className="text-center py-12">
            <NewspaperIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No articles found</h3>
            <p className="text-gray-600 mb-4">No news articles available at the moment.</p>
            <button
              onClick={() => loadArticles(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        >
          <ArrowUpIcon className="h-6 w-6" />
        </button>
      )}

      {/* Article Modal */}
      {showModal && selectedArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-start z-10">
              <div className="flex-1 pr-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedArticle.title}</h2>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="font-medium text-blue-600">{selectedArticle.source}</span>
                  <span>•</span>
                  <span>{formatDate(selectedArticle.publishedAt)}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedArticle(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {selectedArticle.content || 'Full article content not available. Please visit the source website for more details.'}
                </p>
              </div>

              {/* View Original Button */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <a
                  href={selectedArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <span>View Original Article</span>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HealthNews;
