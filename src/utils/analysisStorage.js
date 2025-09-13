// Analysis storage utilities
export const saveAnalysisResult = (analysisData) => {
  const existingAnalyses = getAnalysisResults();
  const newAnalysis = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    status: 'processing',
    processedRecords: 0,
    poolRecords: 0,
    totalRecords: 0,
    ...analysisData
  };
  
  const updatedAnalyses = [...existingAnalyses, newAnalysis];
  localStorage.setItem('analysisResults', JSON.stringify(updatedAnalyses));
  return newAnalysis.id;
};

export const getAnalysisResults = () => {
  const saved = localStorage.getItem('analysisResults');
  return saved ? JSON.parse(saved) : [];
};

export const getAnalysisById = (analysisId) => {
  const analyses = getAnalysisResults();
  return analyses.find(analysis => analysis.id === analysisId);
};

export const updateAnalysisStatus = (analysisId, status) => {
  const analyses = getAnalysisResults();
  const updatedAnalyses = analyses.map(analysis => 
    analysis.id === analysisId 
      ? { ...analysis, status, updatedAt: new Date().toISOString() }
      : analysis
  );
  localStorage.setItem('analysisResults', JSON.stringify(updatedAnalyses));
};

export const addAnalysisRecord = (analysisId, record) => {
  const analyses = getAnalysisResults();
  const updatedAnalyses = analyses.map(analysis => {
    if (analysis.id === analysisId) {
      const newRecord = {
        id: Date.now().toString(),
        analyzedAt: new Date().toISOString(),
        status: 'completed',
        ...record
      };
      return {
        ...analysis,
        records: [...(analysis.records || []), newRecord]
      };
    }
    return analysis;
  });
  localStorage.setItem('analysisResults', JSON.stringify(updatedAnalyses));
};

export const updateAnalysisRecord = (analysisId, recordId, updates) => {
  const analyses = getAnalysisResults();
  const updatedAnalyses = analyses.map(analysis => {
    if (analysis.id === analysisId) {
      return {
        ...analysis,
        records: analysis.records?.map(record => 
          record.id === recordId 
            ? { ...record, ...updates }
            : record
        ) || []
      };
    }
    return analysis;
  });
  localStorage.setItem('analysisResults', JSON.stringify(updatedAnalyses));
};

export const deleteAnalysis = (analysisId) => {
  const analyses = getAnalysisResults();
  const updatedAnalyses = analyses.filter(analysis => analysis.id !== analysisId);
  localStorage.setItem('analysisResults', JSON.stringify(updatedAnalyses));
};

export const updateAnalysisRecordCounts = (analysisId, counts) => {
  const analyses = getAnalysisResults();
  const updatedAnalyses = analyses.map(analysis => {
    if (analysis.id === analysisId) {
      return {
        ...analysis,
        ...counts,
        updatedAt: new Date().toISOString()
      };
    }
    return analysis;
  });
  localStorage.setItem('analysisResults', JSON.stringify(updatedAnalyses));
};

export const setAnalysisTotalRecords = (analysisId, totalRecords) => {
  updateAnalysisRecordCounts(analysisId, { 
    totalRecords,
    poolRecords: totalRecords,
    processedRecords: 0
  });
};

export const incrementProcessedRecords = (analysisId) => {
  const analyses = getAnalysisResults();
  const analysis = analyses.find(a => a.id === analysisId);
  if (analysis) {
    const newProcessed = (analysis.processedRecords || 0) + 1;
    const newPool = Math.max(0, (analysis.poolRecords || 0) - 1);
    
    updateAnalysisRecordCounts(analysisId, {
      processedRecords: newProcessed,
      poolRecords: newPool
    });
  }
};

// Update metrics for home page
export const updateResumeMetrics = () => {
  const analyses = getAnalysisResults();
  let totalResumes = 0;
  let analyzedResumes = 0;
  let lastAnalysis = null;
  let totalScore = 0;
  let scoreCount = 0;

  analyses.forEach(analysis => {
    if (analysis.records) {
      totalResumes += analysis.records.length;
      const completed = analysis.records.filter(r => r.status === 'completed');
      analyzedResumes += completed.length;
      
      completed.forEach(record => {
        if (record.overallScore) {
          totalScore += record.overallScore;
          scoreCount++;
        }
      });
    }
    
    if (!lastAnalysis || new Date(analysis.createdAt) > new Date(lastAnalysis)) {
      lastAnalysis = analysis.createdAt;
    }
  });

  const averageScore = scoreCount > 0 ? totalScore / scoreCount : 0;

  const metrics = {
    totalResumes,
    analyzedResumes,
    lastAnalysis,
    averageScore
  };

  localStorage.setItem('resumeMetrics', JSON.stringify(metrics));
  return metrics;
};
