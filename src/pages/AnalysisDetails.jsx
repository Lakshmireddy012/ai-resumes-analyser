import React, { useState, useEffect, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const AnalysisDetails = () => {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [records, setRecords] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [expandedFields, setExpandedFields] = useState(new Set());
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

  const toggleFieldExpansion = (fieldKey) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(fieldKey)) {
      newExpanded.delete(fieldKey);
    } else {
      newExpanded.add(fieldKey);
    }
    setExpandedFields(newExpanded);
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const renderExpandableField = (fieldKey, label, content, isLong = false) => {
    if (!content || content === 'N/A') return null;
    
    const shouldTruncate = isLong && content.length > 100;
    const isExpanded = expandedFields.has(fieldKey);
    const displayContent = shouldTruncate && !isExpanded ? truncateText(content) : content;

    return (
      <div className="mb-4">
        <div className="flex items-start justify-between">
          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
            {shouldTruncate && (
              <button
                onClick={() => toggleFieldExpansion(fieldKey)}
                className="mr-2 text-blue-600 hover:text-blue-800"
              >
                {isExpanded ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
            )}
            {label}
          </h4>
        </div>
        <p className="text-sm text-gray-600 whitespace-pre-wrap">{displayContent}</p>
      </div>
    );
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    {/* Expand/Collapse column */}
                  </th>
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.map((record) => (
                  <Fragment key={record.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleRowExpansion(record.id)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                        >
                          {expandedRows.has(record.id) ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </button>
                      </td>
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
                    </tr>
                    
                    {/* Expanded Row */}
                    {expandedRows.has(record.id) && (
                      <tr>
                        <td colSpan="6" className="px-6 py-4 bg-gray-50">
                          <div className="space-y-8">
                            {/* Analysis Results Section */}
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                                Analysis Results
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {renderExpandableField(`${record.id}-skillsMatch`, 'Skills Match', record.skillsMatch, true)}
                                {renderExpandableField(`${record.id}-experienceMatch`, 'Experience Match', record.experienceMatch, true)}
                                {renderExpandableField(`${record.id}-educationMatch`, 'Education Match', record.educationMatch, true)}
                                {renderExpandableField(`${record.id}-summary`, 'Executive Summary', record.summary, true)}
                                {renderExpandableField(`${record.id}-strengths`, 'Key Strengths', record.strengths, true)}
                                {renderExpandableField(`${record.id}-weaknesses`, 'Areas for Improvement', record.weaknesses, true)}
                                {renderExpandableField(`${record.id}-recommendations`, 'Recommendations', record.recommendations, true)}
                              </div>
                            </div>

                            {/* Resume Data Section */}
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                                Extracted Resume Data
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Personal Information */}
                                {record.phone && record.phone !== 'N/A' && (
                                  <div className="mb-4">
                                    <h4 className="font-medium text-gray-900 mb-2">Phone</h4>
                                    <p className="text-sm text-gray-600">{record.phone}</p>
                                  </div>
                                )}
                                {record.address && record.address !== 'N/A' && (
                                  <div className="mb-4">
                                    <h4 className="font-medium text-gray-900 mb-2">Address</h4>
                                    <p className="text-sm text-gray-600">{record.address}</p>
                                  </div>
                                )}
                                {record.linkedin && record.linkedin !== 'N/A' && (
                                  <div className="mb-4">
                                    <h4 className="font-medium text-gray-900 mb-2">LinkedIn</h4>
                                    <a href={record.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                      {record.linkedin}
                                    </a>
                                  </div>
                                )}
                                {record.github && record.github !== 'N/A' && (
                                  <div className="mb-4">
                                    <h4 className="font-medium text-gray-900 mb-2">GitHub</h4>
                                    <a href={record.github} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                      {record.github}
                                    </a>
                                  </div>
                                )}

                                {/* Education */}
                                {record.education && Array.isArray(record.education) && record.education.length > 0 && (
                                  <div className="md:col-span-2 lg:col-span-3">
                                    <h4 className="font-medium text-gray-900 mb-2">Education</h4>
                                    <div className="space-y-3">
                                      {record.education.map((edu, index) => (
                                        <div key={index} className="bg-white p-3 rounded border">
                                          <div className="font-medium text-gray-900">{edu.degree}</div>
                                          <div className="text-sm text-gray-600">{edu.institution}</div>
                                          {edu.graduationYear && (
                                            <div className="text-sm text-gray-500">{edu.graduationYear}</div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Work Experience */}
                                {record.workExperience && Array.isArray(record.workExperience) && record.workExperience.length > 0 && (
                                  <div className="md:col-span-2 lg:col-span-3">
                                    <h4 className="font-medium text-gray-900 mb-2">Work Experience</h4>
                                    <div className="space-y-3">
                                      {record.workExperience.map((exp, index) => (
                                        <div key={index} className="bg-white p-3 rounded border">
                                          <div className="font-medium text-gray-900">{exp.position}</div>
                                          <div className="text-sm text-gray-600">{exp.company}</div>
                                          <div className="text-sm text-gray-500">{exp.startDate} - {exp.endDate || 'Present'}</div>
                                          {exp.description && (
                                            <div className="text-sm text-gray-600 mt-2">{exp.description}</div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Skills */}
                                {record.skills && Array.isArray(record.skills) && record.skills.length > 0 && (
                                  <div className="md:col-span-2 lg:col-span-3">
                                    <h4 className="font-medium text-gray-900 mb-2">Skills</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {record.skills.map((skill, index) => (
                                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                                          {skill}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Projects */}
                                {record.projects && Array.isArray(record.projects) && record.projects.length > 0 && (
                                  <div className="md:col-span-2 lg:col-span-3">
                                    <h4 className="font-medium text-gray-900 mb-2">Projects</h4>
                                    <div className="space-y-3">
                                      {record.projects.map((project, index) => (
                                        <div key={index} className="bg-white p-3 rounded border">
                                          <div className="font-medium text-gray-900">{project.name}</div>
                                          {project.description && (
                                            <div className="text-sm text-gray-600 mt-1">{project.description}</div>
                                          )}
                                          {project.technologies && Array.isArray(project.technologies) && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                              {project.technologies.map((tech, techIndex) => (
                                                <span key={techIndex} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                                  {tech}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
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
