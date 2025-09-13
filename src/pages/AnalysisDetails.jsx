import React, { useState, useEffect, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const AnalysisDetails = () => {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [records, setRecords] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalysisData();
  }, [analysisId]);

  const loadAnalysisData = () => {
    try {
      const savedAnalyses = JSON.parse(localStorage.getItem('analysisResults') || '[]');
      const foundAnalysis = savedAnalyses.find(a => a.id === analysisId);
      
      if (foundAnalysis) {
        setAnalysis(foundAnalysis);
        setRecords(foundAnalysis.records || []);
      } else {
        // If analysis not found, redirect to home
        navigate('/');
      }
    } catch (error) {
      console.error('Error loading analysis data:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const toggleRowExpansion = (recordId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(recordId)) {
      newExpanded.delete(recordId);
    } else {
      newExpanded.add(recordId);
    }
    setExpandedRows(newExpanded);
  };

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Analysis Not Found</h1>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const totalRecords = records.length;
  const completedRecords = records.filter(r => r.status === 'completed').length;
  const averageScore = records.length > 0 
    ? records.reduce((sum, r) => sum + (r.overallScore || 0), 0) / records.length 
    : 0;
  const topScore = Math.max(...records.map(r => r.overallScore || 0));
  const lowestScore = Math.min(...records.map(r => r.overallScore || 0));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {analysis.title}
            </h1>
            <p className="text-gray-600">
              Analysis created on {new Date(analysis.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md"
          >
            Back to Home
          </button>
        </div>
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
              <p className="text-sm font-medium text-gray-600">Total Records</p>
              <p className="text-2xl font-semibold text-gray-900">{totalRecords}</p>
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
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">{completedRecords}</p>
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
              <p className="text-2xl font-semibold text-gray-900">{averageScore.toFixed(1)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Score Range</p>
              <p className="text-sm font-semibold text-gray-900">
                {lowestScore.toFixed(1)} - {topScore.toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-lg shadow-sm border pb-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Analysis Records</h2>
        </div>
        
        {records.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No records found for this analysis</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Overall Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Analyzed Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.map((record) => (
                  <Fragment key={record.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {record.fullName || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.email || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {record.currentRole || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreColor(record.overallScore || 0)}`}>
                          {record.overallScore}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                          {record.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.analyzedAt ? new Date(record.analyzedAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => toggleRowExpansion(record.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {expandedRows.has(record.id) ? 'Collapse' : 'Expand'}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded Row */}
                    {expandedRows.has(record.id) && (
                      <tr>
                        <td colSpan="6" className="px-6 py-4 bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Skills Match */}
                            {record.skillsMatch && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">Skills Match</h4>
                                <p className="text-sm text-gray-600">{record.skillsMatch}</p>
                              </div>
                            )}
                            
                            {/* Experience Match */}
                            {record.experienceMatch && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">Experience Match</h4>
                                <p className="text-sm text-gray-600">{record.experienceMatch}</p>
                              </div>
                            )}
                            
                            {/* Education Match */}
                            {record.educationMatch && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">Education Match</h4>
                                <p className="text-sm text-gray-600">{record.educationMatch}</p>
                              </div>
                            )}
                            
                            {/* Summary */}
                            {record.summary && (
                              <div className="md:col-span-2 lg:col-span-3">
                                <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                                <p className="text-sm text-gray-600">{record.summary}</p>
                              </div>
                            )}
                            
                            {/* Strengths */}
                            {record.strengths && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">Strengths</h4>
                                <p className="text-sm text-gray-600">{record.strengths}</p>
                              </div>
                            )}
                            
                            {/* Weaknesses */}
                            {record.weaknesses && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">Areas for Improvement</h4>
                                <p className="text-sm text-gray-600">{record.weaknesses}</p>
                              </div>
                            )}
                            
                            {/* Recommendations */}
                            {record.recommendations && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                                <p className="text-sm text-gray-600">{record.recommendations}</p>
                              </div>
                            )}
                            
                            {/* Custom Fields */}
                            {record.customFields && record.customFields.length > 0 && (
                              <div className="md:col-span-2 lg:col-span-3">
                                <h4 className="font-medium text-gray-900 mb-2">Additional Information</h4>
                                <div className="space-y-2">
                                  {record.customFields.map((field, index) => (
                                    <div key={index}>
                                      <span className="font-medium text-gray-700">{field.name}:</span>
                                      <span className="ml-2 text-sm text-gray-600">{field.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisDetails;
