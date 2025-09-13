import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { deleteAnalysis, updateAnalysisStatus } from '../utils/analysisStorage';
import { aiAnalysisService } from '../services/aiAnalysisService';

const Home = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    totalResumes: 0,
    analyzedResumes: 0,
    lastAnalysis: null,
    averageScore: 0
  });
  const [analysisJobs, setAnalysisJobs] = useState([]);

  useEffect(() => {
    loadData();
    
    // Refresh data every 2 seconds to show real-time updates
    const interval = setInterval(loadData, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    // Load metrics from localStorage
    const savedMetrics = localStorage.getItem('resumeMetrics');
    if (savedMetrics) {
      setMetrics(JSON.parse(savedMetrics));
    }

    // Load analysis jobs
    const savedAnalyses = JSON.parse(localStorage.getItem('analysisResults') || '[]');
    setAnalysisJobs(savedAnalyses);
  };

  const handleAnalyze = () => {
    navigate('/analysis');
  };

  const handleViewAnalysis = (analysisId) => {
    navigate(`/analysis-details/${analysisId}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getProgressPercentage = (analysis) => {
    if (!analysis.totalRecords || analysis.totalRecords === 0) return 0;
    return Math.round((analysis.processedRecords / analysis.totalRecords) * 100);
  };

  const handleDeleteJob = (analysisId) => {
    if (window.confirm('Are you sure you want to delete this analysis job? This action cannot be undone.')) {
      deleteAnalysis(analysisId);
      loadData(); // Reload data
    }
  };

  const handleUseJob = (analysisId) => {
    // Navigate to analysis page with pre-filled job details (but not resumes)
    navigate(`/analysis?use=${analysisId}`);
  };

  const handleStopJob = (analysisId) => {
    if (window.confirm('Are you sure you want to stop this analysis job?')) {
      aiAnalysisService.stopAnalysis();
      updateAnalysisStatus(analysisId, 'stopped');
      loadData(); // Reload data
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI Resume Analyzer Dashboard - Intelligent PDF Resume Analysis
        </h1>
        <p className="text-gray-600">
          Analyze PDF resumes with AI-powered insights, scoring, and job matching. Perfect for HR professionals and recruiters.
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Resumes</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.totalResumes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Analyzed</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.analyzedResumes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Last Analysis</p>
              <p className="text-sm font-semibold text-gray-900">
                {metrics.lastAnalysis ? new Date(metrics.lastAnalysis).toLocaleDateString() : 'Never'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.averageScore.toFixed(1)}</p>
            </div>
          </div>
        </div>
      </div>

            {/* Action Section */}
            <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Start AI-Powered Resume Analysis
          </h2>
          <p className="text-gray-600 mb-6">
            Upload PDF resumes for intelligent analysis with customizable fields and job matching capabilities
          </p>
          <button
            onClick={handleAnalyze}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition-colors duration-200 shadow-sm"
          >
            Start Analysis
          </button>
        </div>
      </div>

      {/* Analysis Jobs Table */}
      {analysisJobs.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Analysis Jobs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Analysis Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Records (P/T)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analysisJobs.map((analysis) => (
                  <tr key={analysis.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {analysis.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {analysis.jobDetails?.title || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {analysis.processedRecords || 0}/{analysis.totalRecords || 0}
                      </div>
                      <div className="text-xs text-gray-500">
                        Pool: {analysis.poolRecords || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${getProgressPercentage(analysis)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">
                          {getProgressPercentage(analysis)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(analysis.status || 'pending')}`}>
                        {analysis.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(analysis.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewAnalysis(analysis.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleUseJob(analysis.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Use This Job
                        </button>
                        {analysis.status === 'processing' && (
                          <button
                            onClick={() => handleStopJob(analysis.id)}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            Stop
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteJob(analysis.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
