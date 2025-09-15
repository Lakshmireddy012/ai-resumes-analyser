import { getDefaultConfiguration } from '../utils/llmConfig.js';
import { createChatModel } from './llmFactory.js';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { BaseOutputParser } from '@langchain/core/output_parsers';

// Custom output parser with better error handling
class RobustJsonOutputParser extends BaseOutputParser {
  constructor(fallbackValue = {}) {
    super();
    this.fallbackValue = fallbackValue;
  }

  async parse(text) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in response');
    } catch (error) {
      console.warn('Failed to parse JSON response, using fallback:', error.message);
      return this.fallbackValue;
    }
  }

  getFormatInstructions() {
    return 'Return a valid JSON object.';
  }
}

// AI Analysis Service for processing resumes
export class AIAnalysisService {
  constructor() {
    this.isProcessing = false;
    this.currentAnalysisId = null;
    this.jsonParser = new JsonOutputParser();
    this.robustJsonParser = new RobustJsonOutputParser();
    this.initializeChains();
  }

  createRobustChain(prompt, model, fallbackValue = {}) {
    return RunnableSequence.from([
      prompt,
      model,
      new RobustJsonOutputParser(fallbackValue)
    ]);
  }

  // Simple retry mechanism for better reliability
  async executeWithRetry(chain, input, maxAttempts = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Executing chain attempt ${attempt}/${maxAttempts}`);
        const result = await chain.invoke(input);
        console.log(`Chain execution successful on attempt ${attempt}`);
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxAttempts) {
          // Wait before retrying (exponential backoff)
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error(`All ${maxAttempts} attempts failed. Last error:`, lastError);
    throw lastError;
  }

  // Method to create streaming chains for real-time updates
  createStreamingChain(prompt, model) {
    return RunnableSequence.from([
      prompt,
      model
    ]);
  }

  // Method to stream extraction progress
  async streamExtractionProgress(rawText, model, onProgress) {
    const steps = [
      { name: 'Personal Information', method: this.extractPersonalInfo.bind(this) },
      { name: 'Education', method: this.extractEducation.bind(this) },
      { name: 'Work Experience', method: this.extractWorkExperience.bind(this) },
      { name: 'Additional Fields', method: this.extractAdditionalFields.bind(this) }
    ];

    const results = {};
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      try {
        onProgress?.(`Extracting ${step.name}...`, (i + 1) / steps.length);
        
        if (step.name === 'Additional Fields') {
          results[step.name.toLowerCase().replace(/\s+/g, '')] = await step.method(rawText, {}, model);
        } else {
          results[step.name.toLowerCase().replace(/\s+/g, '')] = await step.method(rawText, model);
        }
      } catch (error) {
        console.error(`Error in ${step.name} extraction:`, error);
        onProgress?.(`Error extracting ${step.name}`, (i + 1) / steps.length);
      }
    }
    
    return results;
  }

  // Create a comprehensive extraction pipeline using LangChain
  createExtractionPipeline(model, resumeFields = {}) {
    const pipeline = RunnableSequence.from([
      // Input transformation
      (input) => ({ rawText: input.rawText, resumeFields: input.resumeFields || resumeFields }),
      
      // Parallel extraction of different data types
      async (input) => {
        const [personalInfo, educationInfo, workExperienceInfo, additionalFields] = await Promise.allSettled([
          this.extractPersonalInfo(input.rawText, model),
          this.extractEducation(input.rawText, model),
          this.extractWorkExperience(input.rawText, model),
          this.extractAdditionalFields(input.rawText, input.resumeFields, model)
        ]);

        return {
          personalInfo: personalInfo.status === 'fulfilled' ? personalInfo.value : {},
          educationInfo: educationInfo.status === 'fulfilled' ? educationInfo.value : {},
          workExperienceInfo: workExperienceInfo.status === 'fulfilled' ? workExperienceInfo.value : {},
          additionalFields: additionalFields.status === 'fulfilled' ? additionalFields.value : {},
          rawText: input.rawText
        };
      }
    ]);

    return pipeline;
  }

  initializeChains() {
    // Personal Information Extraction Chain
    this.personalInfoPrompt = PromptTemplate.fromTemplate(`
Extract personal information from the following resume text. Return ONLY a valid JSON object with the exact structure shown below:

{{
  "fullName": "John Doe",
  "email": "john.doe@email.com",
  "phone": "+1-555-123-4567",
  "address": "123 Main St, City, State 12345",
  "linkedin": "https://linkedin.com/in/johndoe",
  "github": "https://github.com/johndoe",
  "website": "https://johndoe.com",
  "summary": "Brief professional summary or objective"
}}

RESUME TEXT:
{rawText}

Instructions:
- Extract the most complete and accurate information available
- If a field is not found, use "N/A"
- For phone numbers, use a standard format
- For URLs, include the full URL
- For summary, extract the professional summary or objective section
- Return ONLY the JSON object, no additional text
`);

    // Education Information Extraction Chain
    this.educationPrompt = PromptTemplate.fromTemplate(`
Extract education information from the following resume text. Return ONLY a valid JSON object with the exact structure shown below:

{{
  "education": [
    {{
      "institution": "University Name",
      "degree": "Bachelor of Science in Computer Science",
      "fieldOfStudy": "Computer Science",
      "graduationYear": "2020",
      "gpa": "3.8",
      "location": "City, State",
      "honors": "Magna Cum Laude"
    }}
  ],
  "certifications": [
    {{
      "name": "AWS Certified Solutions Architect",
      "issuer": "Amazon Web Services",
      "date": "2023",
      "expiryDate": "2026"
    }}
  ]
}}

RESUME TEXT:
{rawText}

Instructions:
- Extract all educational institutions and degrees
- Include certifications, licenses, and professional qualifications
- Use "N/A" for missing fields
- For dates, use YYYY format
- Return ONLY the JSON object, no additional text
`);

    // Work Experience Extraction Chain
    this.workExperiencePrompt = PromptTemplate.fromTemplate(`
Extract work experience from the following resume text. Return ONLY a valid JSON object with the exact structure shown below:

{{
  "workExperience": [
    {{
      "company": "Company Name",
      "position": "Software Engineer",
      "startDate": "2020-01",
      "endDate": "2023-12",
      "current": false,
      "location": "San Francisco, CA",
      "description": "Detailed job description and responsibilities",
      "achievements": ["Achievement 1", "Achievement 2"],
      "technologies": ["JavaScript", "React", "Node.js"]
    }}
  ],
  "projects": [
    {{
      "name": "Project Name",
      "description": "Project description",
      "technologies": ["React", "Node.js"],
      "url": "https://project-url.com",
      "date": "2023"
    }}
  ]
}}

RESUME TEXT:
{rawText}

Instructions:
- Extract all work experience in chronological order (most recent first)
- Include internships, part-time, and full-time positions
- Extract projects, side projects, and portfolio items
- Use "N/A" for missing fields
- For dates, use YYYY-MM format
- Set "current": true for ongoing positions
- Return ONLY the JSON object, no additional text
`);

    // Additional Fields Extraction Chain
    this.additionalFieldsPrompt = PromptTemplate.fromTemplate(`
Extract additional resume fields from the following resume text. Return ONLY a valid JSON object with the exact structure shown below:

{schema}

RESUME TEXT:
{rawText}

Instructions:
{instructions}
- Use "N/A" for missing fields
- Return ONLY the JSON object, no additional text
`);

    // Final Analysis Chain
    this.finalAnalysisPrompt = PromptTemplate.fromTemplate(`
Analyze the candidate against the job requirements using the structured data as primary truth. Use raw resume text ONLY to verify facts or fill gaps, but NEVER contradict the structured data.

JOB DETAILS:
Title: {jobTitle}
Description: {jobDescription}
Requirements: {jobRequirements}
Experience Level: {jobExperience}
Location: {jobLocation}

CANDIDATE STRUCTURED DATA (primary source):
Personal: {personalInfo}
Education: {educationInfo}
Work Experience: {workExperienceInfo}
Additional Fields: {additionalFields}

RAW RESUME TEXT (for verification only):
{rawText}

Provide your analysis in the following JSON format:
{analysisSchema}

Instructions:
- Prioritize the structured data; only use raw text to confirm or add missing details
- Score the overall match from 1-10 (10 being perfect)
- Analyze skills match, experience match, and education match with concise reasoning
- Provide specific strengths, gaps, and actionable recommendations
- Be factual and avoid hallucinations; respond ONLY with a valid JSON object
`);
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
      const model = await createChatModel(llmConfig);

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
          
          // Analyze resume using extracted structured data and raw text
          const analysisResult = await this.analyzeResume(resumeData, analysis, model);
          
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

  async analyzeResume(resumeData, analysisConfig, model) {
    try {
      console.log('Starting analysis using extracted structured data...');
      const { structuredData = {}, rawText = '' } = resumeData || {};

      // Map structured data to expected sections
      const personalInfoFromExtract = {
        fullName: structuredData.fullName || structuredData.name || 'N/A',
        email: structuredData.email || 'N/A',
        phone: structuredData.phone || 'N/A',
        address: structuredData.address || 'N/A',
        linkedin: structuredData.linkedin || 'N/A',
        github: structuredData.github || 'N/A',
        website: structuredData.website || 'N/A',
        summary: structuredData.summary || structuredData.professionalSummary || 'N/A',
        currentRole: structuredData.currentRole || structuredData.title || undefined
      };

      const educationList = Array.isArray(structuredData.education) ? structuredData.education : [];
      const certificationsList = Array.isArray(structuredData.certifications) ? structuredData.certifications : [];
      const educationInfoFromExtract = {
        education: educationList,
        certifications: certificationsList
      };

      const workExperienceList = Array.isArray(structuredData.workExperience) ? structuredData.workExperience : [];
      const projectsList = Array.isArray(structuredData.projects) ? structuredData.projects : [];
      const workExperienceInfoFromExtract = {
        workExperience: workExperienceList,
        projects: projectsList
      };

      const additionalFieldsFromExtract = {};
      if (Array.isArray(structuredData.skills)) additionalFieldsFromExtract.skills = structuredData.skills;
      if (Array.isArray(structuredData.languages)) additionalFieldsFromExtract.languages = structuredData.languages;
      if (Array.isArray(structuredData.awards)) additionalFieldsFromExtract.awards = structuredData.awards;
      if (Array.isArray(structuredData.publications)) additionalFieldsFromExtract.publications = structuredData.publications;
      if (Array.isArray(structuredData.volunteerExperience)) additionalFieldsFromExtract.volunteerExperience = structuredData.volunteerExperience;

      // Include custom fields if present in config
      const customFields = analysisConfig?.resumeFields?.customResumeFields || [];
      if (Array.isArray(customFields)) {
        customFields.forEach(field => {
          if (field?.name) {
            const key = field.name.toLowerCase().replace(/\s+/g, '_');
            if (structuredData[key] !== undefined) {
              additionalFieldsFromExtract[key] = structuredData[key];
            }
          }
        });
      }

      // Optional fallback: if critical sections are empty, attempt LLM extraction from raw text
      const needsPersonal = !personalInfoFromExtract.fullName || personalInfoFromExtract.fullName === 'N/A';
      const needsEducation = educationList.length === 0;
      const needsWork = workExperienceList.length === 0;

      const [personalInfo, educationInfo, workExperienceInfo] = await Promise.all([
        needsPersonal ? this.extractPersonalInfo(rawText, model) : Promise.resolve(personalInfoFromExtract),
        needsEducation ? this.extractEducation(rawText, model) : Promise.resolve(educationInfoFromExtract),
        needsWork ? this.extractWorkExperience(rawText, model) : Promise.resolve(workExperienceInfoFromExtract)
      ]);

      // Additional fields: if none present and config requests them, try extracting
      let additionalFields = additionalFieldsFromExtract;
      const wantsAdditional = analysisConfig?.resumeFields && (
        analysisConfig.resumeFields.skills ||
        analysisConfig.resumeFields.languages ||
        analysisConfig.resumeFields.awards ||
        analysisConfig.resumeFields.publications ||
        analysisConfig.resumeFields.volunteerExperience ||
        (Array.isArray(analysisConfig.resumeFields.customResumeFields) && analysisConfig.resumeFields.customResumeFields.length > 0)
      );
      const hasAdditional = Object.keys(additionalFieldsFromExtract).length > 0;
      if (wantsAdditional && !hasAdditional) {
        additionalFields = await this.extractAdditionalFields(rawText, analysisConfig.resumeFields || {}, model);
      }

      // Final analysis
      const analysisResult = await this.performFinalAnalysis({
        personalInfo,
        educationInfo,
        workExperienceInfo,
        additionalFields,
        jobDetails: analysisConfig.jobDetails,
        outputFields: analysisConfig.outputFields,
        rawText
      }, model);

      return analysisResult;
    } catch (error) {
      console.error('Multi-step extraction failed:', error);
      throw new Error(`LLM analysis failed: ${error.message}`);
    }
  }


  async extractPersonalInfo(rawText, model) {
    try {
      // Create the extraction chain
      const personalInfoChain = this.createRobustChain(
        this.personalInfoPrompt,
        model,
        {
          fullName: 'N/A',
          email: 'N/A',
          phone: 'N/A',
          address: 'N/A',
          linkedin: 'N/A',
          github: 'N/A',
          website: 'N/A',
          summary: 'N/A'
        }
      );

      // Execute the chain with retry logic
      const result = await this.executeWithRetry(personalInfoChain, { rawText });
      return result;
    } catch (error) {
      console.error('Error extracting personal info:', error);
      return {
        fullName: 'N/A',
        email: 'N/A',
        phone: 'N/A',
        address: 'N/A',
        linkedin: 'N/A',
        github: 'N/A',
        website: 'N/A',
        summary: 'N/A'
      };
    }
  }

  async extractEducation(rawText, model) {
    try {
      // Create the extraction chain
      const educationChain = this.createRobustChain(
        this.educationPrompt,
        model,
        {
          education: [],
          certifications: []
        }
      );

      // Execute the chain with retry logic
      const result = await this.executeWithRetry(educationChain, { rawText });
      return result;
    } catch (error) {
      console.error('Error extracting education:', error);
      return {
        education: [],
        certifications: []
      };
    }
  }

  async extractWorkExperience(rawText, model) {
    try {
      // Create the extraction chain
      const workExperienceChain = this.createRobustChain(
        this.workExperiencePrompt,
        model,
        {
          workExperience: [],
          projects: []
        }
      );

      // Execute the chain with retry logic
      const result = await this.executeWithRetry(workExperienceChain, { rawText });
      return result;
    } catch (error) {
      console.error('Error extracting work experience:', error);
      return {
        workExperience: [],
        projects: []
      };
    }
  }

  async extractAdditionalFields(rawText, resumeFields, model) {
    try {
      // Build the JSON schema based on selected resume fields
      const schema = {};
      const instructions = [];
      
      if (resumeFields.skills) {
        schema.skills = ["JavaScript", "React", "Node.js", "Python"];
        instructions.push("- Extract skills as an array of strings");
      }
      
      if (resumeFields.languages) {
        schema.languages = [
          {
            "language": "English",
            "proficiency": "Native"
          },
          {
            "language": "Spanish", 
            "proficiency": "Fluent"
          }
        ];
        instructions.push("- Include languages with proficiency levels");
      }
      
      if (resumeFields.awards) {
        schema.awards = [
          {
            "name": "Employee of the Year",
            "issuer": "Company Name",
            "date": "2023"
          }
        ];
        instructions.push("- Extract awards, honors, and recognitions");
      }
      
      if (resumeFields.publications) {
        schema.publications = [
          {
            "title": "Article Title",
            "journal": "Journal Name",
            "date": "2023",
            "url": "https://example.com"
          }
        ];
        instructions.push("- Include publications, papers, and articles");
      }
      
      if (resumeFields.volunteerExperience) {
        schema.volunteerExperience = [
          {
            "organization": "Organization Name",
            "role": "Volunteer Role",
            "startDate": "2020",
            "endDate": "2023",
            "description": "Description of volunteer work"
          }
        ];
        instructions.push("- Extract volunteer experience and community involvement");
      }

      // Add custom resume fields
      if (resumeFields.customResumeFields && Array.isArray(resumeFields.customResumeFields)) {
        resumeFields.customResumeFields.forEach(field => {
          if (field.name) {
            const fieldKey = field.name.toLowerCase().replace(/\s+/g, '_');
            schema[fieldKey] = `Value for ${field.name}`;
            instructions.push(`- Extract ${field.name} information`);
          }
        });
      }

      // Create the extraction chain
      const additionalFieldsChain = this.createRobustChain(
        this.additionalFieldsPrompt,
        model,
        schema
      );

      // Execute the chain with retry logic
      const result = await this.executeWithRetry(additionalFieldsChain, { 
        rawText, 
        schema: JSON.stringify(schema, null, 2),
        instructions: instructions.join('\n')
      });
      
      return result;
    } catch (error) {
      console.error('Error extracting additional fields:', error);
      const errorResult = {};
      
      if (resumeFields.skills) errorResult.skills = [];
      if (resumeFields.languages) errorResult.languages = [];
      if (resumeFields.awards) errorResult.awards = [];
      if (resumeFields.publications) errorResult.publications = [];
      if (resumeFields.volunteerExperience) errorResult.volunteerExperience = [];
      
      // Add custom resume fields
      if (resumeFields.customResumeFields && Array.isArray(resumeFields.customResumeFields)) {
        resumeFields.customResumeFields.forEach(field => {
          if (field.name) {
            const fieldKey = field.name.toLowerCase().replace(/\s+/g, '_');
            errorResult[fieldKey] = 'N/A';
          }
        });
      }
      
      return errorResult;
    }
  }

  async performFinalAnalysis(extractedData, model) {
    const { personalInfo, educationInfo, workExperienceInfo, additionalFields, jobDetails, outputFields, rawText } = extractedData;
    
    try {
      // Create the final analysis chain
      const finalAnalysisChain = this.createRobustChain(
        this.finalAnalysisPrompt,
        model,
        {
          overallScore: 0,
          skillsMatch: 'Analysis failed',
          experienceMatch: 'Analysis failed',
          educationMatch: 'Analysis failed',
          summary: 'Analysis failed',
          strengths: 'Analysis failed',
          weaknesses: 'Analysis failed',
          recommendations: 'Analysis failed'
        }
      );

      // Execute the chain with retry logic
      const analysis = await this.executeWithRetry(finalAnalysisChain, {
        jobTitle: jobDetails.title,
        jobDescription: jobDetails.description || 'N/A',
        jobRequirements: jobDetails.requirements || 'N/A',
        jobExperience: jobDetails.experience || 'N/A',
        jobLocation: jobDetails.location || 'N/A',
        personalInfo: JSON.stringify(personalInfo, null, 2),
        educationInfo: JSON.stringify(educationInfo, null, 2),
        workExperienceInfo: JSON.stringify(workExperienceInfo, null, 2),
        additionalFields: JSON.stringify(additionalFields, null, 2),
        analysisSchema: this.generateJsonSchema(outputFields),
        rawText: rawText || ''
      });
      
      // Combine all extracted data with analysis results
      return {
        ...personalInfo,
        ...educationInfo,
        ...workExperienceInfo,
        ...additionalFields,
        ...analysis,
        status: 'completed',
        analyzedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in final analysis:', error);
      return {
        ...personalInfo,
        ...educationInfo,
        ...workExperienceInfo,
        ...additionalFields,
        status: 'failed',
        error: error.message,
        analyzedAt: new Date().toISOString()
      };
    }
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

    // Add custom analysis fields
    if (outputFields.customAnalysisFields && Array.isArray(outputFields.customAnalysisFields)) {
      outputFields.customAnalysisFields.forEach(field => {
        if (field.name) {
          schema[field.name.toLowerCase().replace(/\s+/g, '_')] = `Analysis for ${field.name}`;
        }
      });
    }

    return JSON.stringify(schema, null, 2);
  }



  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const aiAnalysisService = new AIAnalysisService();
