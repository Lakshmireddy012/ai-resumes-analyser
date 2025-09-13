import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { saveAnalysisResult, getAnalysisById } from '../utils/analysisStorage';
import { aiAnalysisService } from '../services/aiAnalysisService';
import { pdfExtractionService } from '../services/pdfExtractionService';

const Analysis = () => {
  const [searchParams] = useSearchParams();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [analysisTitle, setAnalysisTitle] = useState('');
  const [jobDetails, setJobDetails] = useState({
    title: '',
    description: '',
    requirements: '',
    experience: '',
    location: '',
    salary: ''
  });
  const [isUsingExistingJob, setIsUsingExistingJob] = useState(false);
  const [outputFields, setOutputFields] = useState({
    // Default fields
    fullName: true,
    currentRole: true,
    overallScore: true,
    skillsMatch: true,
    experienceMatch: true,
    educationMatch: true,
    summary: true,
    strengths: true,
    weaknesses: true,
    recommendations: true,
    // Custom fields
    customFields: []
  });
  const [newCustomField, setNewCustomField] = useState('');

  const defaultFields = [
    { key: 'fullName', label: 'Full Name' },
    { key: 'currentRole', label: 'Current Role' },
    { key: 'overallScore', label: 'Overall Score (1-10)' },
    { key: 'skillsMatch', label: 'Skills Match Analysis' },
    { key: 'experienceMatch', label: 'Experience Match Analysis' },
    { key: 'educationMatch', label: 'Education Match Analysis' },
    { key: 'summary', label: 'Executive Summary' },
    { key: 'strengths', label: 'Key Strengths' },
    { key: 'weaknesses', label: 'Areas for Improvement' },
    { key: 'recommendations', label: 'Recommendations' }
  ];

  const resumeFields = [
    'Contact Information',
    'Professional Summary',
    'Work Experience',
    'Education',
    'Skills',
    'Certifications',
    'Projects',
    'Languages',
    'Publications',
    'Awards',
    'Volunteer Experience'
  ];

  useEffect(() => {
    // Load saved custom fields
    const savedCustomFields = localStorage.getItem('customAnalysisFields');
    if (savedCustomFields) {
      setOutputFields(prev => ({
        ...prev,
        customFields: JSON.parse(savedCustomFields)
      }));
    }

    // Handle "Use This Job" functionality
    const useJobId = searchParams.get('use');
    if (useJobId) {
      const existingJob = getAnalysisById(useJobId);
      if (existingJob) {
        setIsUsingExistingJob(true);
        setJobDetails(existingJob.jobDetails || {});
        setOutputFields(existingJob.outputFields || outputFields);
        // Don't pre-fill analysis title - let user create new one
        // Don't pre-fill files - user needs to select new resumes
      }
    }
  }, [searchParams]);

  const handleJobDetailsChange = (e) => {
    const { name, value } = e.target;
    setJobDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOutputFieldChange = (fieldKey) => {
    setOutputFields(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }));
  };

  const handleAddCustomField = () => {
    if (newCustomField.trim()) {
      const customField = {
        id: Date.now(),
        name: newCustomField.trim(),
        type: 'text'
      };
      setOutputFields(prev => ({
        ...prev,
        customFields: [...prev.customFields, customField]
      }));
      setNewCustomField('');
    }
  };

  const handleRemoveCustomField = (id) => {
    setOutputFields(prev => ({
      ...prev,
      customFields: prev.customFields.filter(field => field.id !== id)
    }));
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const pdfFiles = files.filter(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      alert('Please select at least one PDF file');
      return;
    }
    
    setSelectedFiles(pdfFiles);
  };

  const handleStartAnalysis = async () => {
    // Validate inputs
    if (!analysisTitle.trim()) {
      alert('Please provide an analysis title');
      return;
    }

    if (selectedFiles.length === 0) {
      alert('Please select at least one PDF file for analysis');
      return;
    }

    if (!jobDetails.title.trim()) {
      alert('Please provide a job title');
      return;
    }

    // Save custom fields
    localStorage.setItem('customAnalysisFields', JSON.stringify(outputFields.customFields));

    // Convert files to a format that can be stored
    const filesData = selectedFiles.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }));

    // Create analysis record
    const analysisData = {
      title: analysisTitle,
      mode: 'bulk', // Always use bulk mode
      jobDetails,
      outputFields,
      files: filesData,
      fileCount: selectedFiles.length,
      records: []
    };

    // Save analysis
    const analysisId = saveAnalysisResult(analysisData);
    
    try {
      // Show loading message
      alert(`Analysis "${analysisTitle}" is starting... Please wait while we extract text from PDFs.`);
      
      // Extract text from all PDF files first
      const extractedResumeData = [];
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        console.log(`Extracting text from PDF ${i + 1}/${selectedFiles.length}: ${file.name}`);
        
        try {
          const extractionResult = await pdfExtractionService.extractResumeData(file, jobDetails);
          
          if (extractionResult.success) {
            extractedResumeData.push({
              fileName: file.name,
              structuredData: extractionResult.structuredData,
              rawText: extractionResult.rawText,
              metadata: extractionResult.metadata
            });
          } else {
            console.error(`Failed to extract text from ${file.name}:`, extractionResult.error);
            extractedResumeData.push({
              fileName: file.name,
              structuredData: null,
              rawText: '',
              metadata: null,
              error: extractionResult.error
            });
          }
        } catch (error) {
          console.error(`Error extracting text from ${file.name}:`, error);
          extractedResumeData.push({
            fileName: file.name,
            structuredData: null,
            rawText: '',
            metadata: null,
            error: error.message
          });
        }
      }
      
      // Start AI analysis with extracted data
      await aiAnalysisService.startAnalysis(analysisId, extractedResumeData);
      
      console.log(`Analysis "${analysisTitle}" completed successfully!`);
      alert(`Analysis "${analysisTitle}" has been completed! You can view the results on the home page.`);
      
    } catch (error) {
      console.error(`Analysis "${analysisTitle}" failed:`, error);
      alert(`Analysis failed: ${error.message}`);
    }
    
    // Reset form
    setAnalysisTitle('');
    setSelectedFiles([]);
    setJobDetails({
      title: '',
      description: '',
      requirements: '',
      experience: '',
      location: '',
      salary: ''
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isUsingExistingJob ? 'New AI Resume Analysis' : 'AI Resume Analysis - PDF Resume Processing'}
        </h1>
        <p className="text-gray-600">
          {isUsingExistingJob 
            ? 'Using job configuration from existing analysis. Select new PDF resumes to analyze with AI-powered insights.'
            : 'Configure and start analyzing PDF resumes with AI-powered insights, scoring, and job matching capabilities'
          }
        </p>
        {isUsingExistingJob && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  Job details and analysis settings have been pre-filled from the existing analysis. 
                  Please provide a new analysis title and select the resumes you want to analyze.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Configuration */}
        <div className="space-y-6">
          {/* Analysis Title */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Analysis Configuration
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Analysis Title *
              </label>
              <input
                type="text"
                value={analysisTitle}
                onChange={(e) => setAnalysisTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Software Engineer Positions - Q1 2024"
              />
              <p className="mt-1 text-sm text-gray-500">
                This title will be used to identify and organize your analysis results
              </p>
            </div>
          </div>


          {/* File Selection */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Select Resume Files
            </h2>
            
            <div>
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {selectedFiles.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600 font-medium">
                    Selected {selectedFiles.length} file(s):
                  </p>
                  <ul className="mt-1 text-sm text-gray-500 list-disc list-inside">
                    {selectedFiles.map((file, index) => (
                      <li key={index}>{file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="mt-2 text-sm text-gray-500">
                Select one or more PDF files for analysis. You can choose a single resume or multiple resumes for batch processing.
              </p>
            </div>
          </div>

          {/* Job Details */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Job Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={jobDetails.title}
                  onChange={handleJobDetailsChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Senior Software Engineer"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Description
                </label>
                <textarea
                  name="description"
                  value={jobDetails.description}
                  onChange={handleJobDetailsChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Detailed job description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requirements
                </label>
                <textarea
                  name="requirements"
                  value={jobDetails.requirements}
                  onChange={handleJobDetailsChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Required skills, experience, education..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Experience Level
                  </label>
                  <input
                    type="text"
                    name="experience"
                    value={jobDetails.experience}
                    onChange={handleJobDetailsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 3-5 years"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={jobDetails.location}
                    onChange={handleJobDetailsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., San Francisco, CA"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Output Configuration */}
        <div className="space-y-6">
          {/* Default Output Fields */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Default Analysis Fields
            </h2>
            <div className="space-y-3">
              {defaultFields.map(field => (
                <label key={field.key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={outputFields[field.key]}
                    onChange={() => handleOutputFieldChange(field.key)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    {field.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Resume Fields to Extract */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Resume Fields to Extract
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {resumeFields.map(field => (
                <div key={field} className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {field}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Fields */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Custom Analysis Fields
            </h2>
            
            <div className="flex space-x-2 mb-4">
              <input
                type="text"
                value={newCustomField}
                onChange={(e) => setNewCustomField(e.target.value)}
                placeholder="Add custom field name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddCustomField}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>

            {outputFields.customFields.length > 0 && (
              <div className="space-y-2">
                {outputFields.customFields.map(field => (
                  <div key={field.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm text-gray-700">{field.name}</span>
                    <button
                      onClick={() => handleRemoveCustomField(field.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Start Analysis Button */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <button
              onClick={handleStartAnalysis}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              Start Analysis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analysis;
