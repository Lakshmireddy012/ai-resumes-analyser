import { getDefaultConfiguration } from '../utils/llmConfig.js';

// AI Analysis Service for processing resumes
export class AIAnalysisService {
  constructor() {
    this.isProcessing = false;
    this.currentAnalysisId = null;
  }

  async startAnalysis(analysisId, extractedResumeData = null) {
    if (this.isProcessing) {
      throw new Error('Analysis is already in progress');
    }

    this.isProcessing = true;
    this.currentAnalysisId = analysisId;

    try {
      // Get analysis data
      const { getAnalysisById, setAnalysisTotalRecords, addAnalysisRecord, incrementProcessedRecords, updateAnalysisStatus } = await import('../utils/analysisStorage.js');
      const analysis = getAnalysisById(analysisId);
      
      if (!analysis) {
        throw new Error('Analysis not found');
      }

      // Get LLM configuration
      const llmConfig = getDefaultConfiguration();
      if (!llmConfig) {
        throw new Error('No LLM configuration found. Please configure your LLM settings first.');
      }

      // Initialize LLM
      const model = await this.initializeLLM(llmConfig);

      // Check if we have extracted resume data to process
      if (!extractedResumeData || extractedResumeData.length === 0) {
        throw new Error('No resume data found to process');
      }

      const totalResumes = extractedResumeData.length;
      setAnalysisTotalRecords(analysisId, totalResumes);

      // Process resumes one by one
      for (let i = 0; i < totalResumes; i++) {
        if (!this.isProcessing) {
          break; // Stop if analysis was stopped
        }

        try {
          const resumeData = extractedResumeData[i];
          console.log(`Processing resume ${i + 1}/${totalResumes}: ${resumeData.fileName || 'Unknown'}`);
          
          // Analyze resume using extracted data
          const analysisResult = await this.analyzeResume(resumeData.structuredData, analysis, model);
          
          // Add analysis record
          addAnalysisRecord(analysisId, analysisResult);
          
          // Update counts
          incrementProcessedRecords(analysisId);
          
          // Small delay to prevent overwhelming the system
          await this.delay(500);
          
        } catch (error) {
          console.error(`Error processing resume ${i + 1}:`, error);
          // Add failed record
          addAnalysisRecord(analysisId, {
            fullName: `Resume ${i + 1}`,
            status: 'failed',
            error: error.message
          });
          incrementProcessedRecords(analysisId);
        }
      }

      // Mark analysis as completed
      updateAnalysisStatus(analysisId, 'completed');
      
    } catch (error) {
      console.error('Analysis failed:', error);
      const { updateAnalysisStatus } = await import('../utils/analysisStorage.js');
      updateAnalysisStatus(analysisId, 'failed');
      throw error;
    } finally {
      this.isProcessing = false;
      this.currentAnalysisId = null;
    }
  }

  async stopAnalysis() {
    this.isProcessing = false;
    if (this.currentAnalysisId) {
      const { updateAnalysisStatus } = await import('../utils/analysisStorage.js');
      updateAnalysisStatus(this.currentAnalysisId, 'stopped');
    }
  }

  async initializeLLM(config) {
    try {
      if (config.provider === 'ollama') {
        const { ChatOllama } = await import('@langchain/ollama');
        return new ChatOllama({
          baseUrl: config.baseUrl,
          model: config.model,
          temperature: parseFloat(config.temperature),
        });
      } else if (config.provider === 'openai') {
        const { ChatOpenAI } = await import('@langchain/openai');
        return new ChatOpenAI({
          apiKey: config.apiKey,
          model: config.model,
          temperature: parseFloat(config.temperature),
        });
      } else if (config.provider === 'anthropic') {
        const { ChatAnthropic } = await import('@langchain/anthropic');
        return new ChatAnthropic({
          apiKey: config.apiKey,
          model: config.model,
          temperature: parseFloat(config.temperature),
        });
      }
      throw new Error(`Unsupported provider: ${config.provider}`);
    } catch (error) {
      throw new Error(`Failed to initialize LLM: ${error.message}`);
    }
  }

  async analyzeResume(resumeData, analysisConfig, model) {
    const prompt = this.buildAnalysisPrompt(resumeData, analysisConfig);
    
    try {
      const response = await model.invoke(prompt);
      return this.parseAnalysisResponse(response.content, resumeData, analysisConfig.outputFields);
    } catch (error) {
      throw new Error(`LLM analysis failed: ${error.message}`);
    }
  }


  buildAnalysisPrompt(resumeData, analysisConfig) {
    const jobDetails = analysisConfig.jobDetails;
    const outputFields = analysisConfig.outputFields;

    // Generate dynamic JSON schema based on selected fields
    const jsonSchema = this.generateJsonSchema(outputFields);

    return `Please analyze the following resume against the job requirements and provide a detailed assessment.

JOB DETAILS:
Title: ${jobDetails.title}
Description: ${jobDetails.description || 'N/A'}
Requirements: ${jobDetails.requirements || 'N/A'}
Experience Level: ${jobDetails.experience || 'N/A'}
Location: ${jobDetails.location || 'N/A'}

RAW RESUME TEXT:
${resumeData.rawText || 'N/A'}

STRUCTURED CANDIDATE INFORMATION:
Name: ${resumeData.fullName || 'N/A'}
Email: ${resumeData.email || 'N/A'}
Current Role: ${resumeData.currentRole || 'N/A'}
Experience: ${resumeData.experience || 'N/A'}
Education: ${resumeData.education || 'N/A'}
Skills: ${Array.isArray(resumeData.skills) ? resumeData.skills.join(', ') : resumeData.skills || 'N/A'}
Summary: ${resumeData.summary || 'N/A'}

WORK EXPERIENCE:
${resumeData.workExperience && Array.isArray(resumeData.workExperience) 
  ? resumeData.workExperience.map(exp => 
      `${exp.position} at ${exp.company} (${exp.duration})\n${exp.description || ''}`
    ).join('\n\n')
  : 'N/A'
}

PROJECTS:
${resumeData.projects && Array.isArray(resumeData.projects)
  ? resumeData.projects.map(proj => 
      `${proj.name}\n${proj.description || ''}\nTechnologies: ${Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies || 'N/A'}`
    ).join('\n\n')
  : 'N/A'
}

Please provide your analysis in the following JSON format:
${jsonSchema}

Please ensure the response is valid JSON and includes all requested fields.`;
  }

  generateJsonSchema(outputFields) {
    const schema = {};
    
    // Add default fields that are selected
    const defaultFieldMappings = {
      fullName: 'fullName',
      currentRole: 'currentRole',
      overallScore: 'overallScore',
      skillsMatch: 'skillsMatch',
      experienceMatch: 'experienceMatch',
      educationMatch: 'educationMatch',
      summary: 'summary',
      strengths: 'strengths',
      weaknesses: 'weaknesses',
      recommendations: 'recommendations'
    };

    // Add selected default fields
    Object.entries(defaultFieldMappings).forEach(([fieldKey, jsonKey]) => {
      if (outputFields[fieldKey]) {
        if (fieldKey === 'overallScore') {
          schema[jsonKey] = 8.5; // Example numeric value
        } else {
          schema[jsonKey] = `Analysis for ${jsonKey}`; // Example text value
        }
      }
    });

    // Add custom fields
    if (outputFields.customFields && Array.isArray(outputFields.customFields)) {
      outputFields.customFields.forEach(field => {
        if (field.name) {
          schema[field.name.toLowerCase().replace(/\s+/g, '_')] = `Analysis for ${field.name}`;
        }
      });
    }

    return JSON.stringify(schema, null, 2);
  }

  parseAnalysisResponse(response, resumeData, outputFields) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        
        // Build result object dynamically based on selected fields
        const result = {
          fullName: resumeData.fullName || 'Unknown',
          email: resumeData.email || 'N/A',
          currentRole: resumeData.currentRole || 'N/A',
          status: 'completed'
        };

        // Add selected default fields
        const defaultFieldMappings = {
          fullName: 'fullName',
          currentRole: 'currentRole',
          overallScore: 'overallScore',
          skillsMatch: 'skillsMatch',
          experienceMatch: 'experienceMatch',
          educationMatch: 'educationMatch',
          summary: 'summary',
          strengths: 'strengths',
          weaknesses: 'weaknesses',
          recommendations: 'recommendations'
        };

        Object.entries(defaultFieldMappings).forEach(([fieldKey, jsonKey]) => {
          if (outputFields[fieldKey]) {
            result[jsonKey] = analysis[jsonKey] || 'N/A';
          }
        });

        // Add custom fields
        if (outputFields.customFields && Array.isArray(outputFields.customFields)) {
          outputFields.customFields.forEach(field => {
            if (field.name) {
              const fieldKey = field.name.toLowerCase().replace(/\s+/g, '_');
              result[fieldKey] = analysis[fieldKey] || 'N/A';
            }
          });
        }

        return result;
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (error) {
      // Return error result with basic fields
      const errorResult = {
        fullName: resumeData.fullName || 'Unknown',
        email: resumeData.email || 'N/A',
        currentRole: resumeData.currentRole || 'N/A',
        status: 'failed',
        error: error.message
      };

      // Add selected fields with error values
      const defaultFieldMappings = {
        fullName: 'fullName',
        currentRole: 'currentRole',
        overallScore: 'overallScore',
        skillsMatch: 'skillsMatch',
        experienceMatch: 'experienceMatch',
        educationMatch: 'educationMatch',
        summary: 'summary',
        strengths: 'strengths',
        weaknesses: 'weaknesses',
        recommendations: 'recommendations'
      };

      Object.entries(defaultFieldMappings).forEach(([fieldKey, jsonKey]) => {
        if (outputFields[fieldKey]) {
          errorResult[jsonKey] = 'Analysis failed';
        }
      });

      // Add custom fields with error values
      if (outputFields.customFields && Array.isArray(outputFields.customFields)) {
        outputFields.customFields.forEach(field => {
          if (field.name) {
            const fieldKey = field.name.toLowerCase().replace(/\s+/g, '_');
            errorResult[fieldKey] = 'Analysis failed';
          }
        });
      }

      return errorResult;
    }
  }


  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const aiAnalysisService = new AIAnalysisService();
