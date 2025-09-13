import * as pdfjsLib from "pdfjs-dist/build/pdf";
import { createChatModel } from "./llmFactory.js";
import { getDefaultConfiguration } from "../utils/llmConfig.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
// PDF Extraction Service for resume analysis
export class PDFExtractionService {
  constructor() {
    this.supportedFormats = ['.pdf'];
  }

  async extractTextFromPDF(file) {
    try {
      // Check if file is PDF
      if (!this.isPDFFile(file)) {
        throw new Error('File is not a PDF');
      }

      // Read PDF content
      const arrayBuffer = await this.fileToArrayBuffer(file);
      
      try {
        const pdfData = await this.parsePDF(arrayBuffer);
        return {
          success: true,
          text: pdfData.text,
          pages: pdfData.pages,
          metadata: pdfData.metadata
        };
      } catch (pdfError) {
        console.warn('PDF parsing failed, trying fallback method:', pdfError);
        // Fallback: return basic file info
        return {
          success: true,
          text: `PDF file: ${file.name}\nNote: PDF text extraction failed, using basic file information.`,
          pages: 1,
          metadata: {
            title: file.name,
            author: '',
            creator: '',
            producer: '',
            creationDate: '',
            modificationDate: ''
          }
        };
      }
    } catch (error) {
      console.error('PDF extraction error:', error);
      return {
        success: false,
        error: error.message,
        text: '',
        pages: 0
      };
    }
  }

  async extractResumeData(file, jobDetails) {
    try {
      // Extract text from PDF
      const pdfResult = await this.extractTextFromPDF(file);
      
      if (!pdfResult.success) {
        throw new Error(pdfResult.error);
      }

      // Use AI to extract structured resume data
      const resumeData = await this.extractStructuredData(pdfResult.text, jobDetails);
      
      return {
        success: true,
        rawText: pdfResult.text,
        structuredData: resumeData,
        metadata: pdfResult.metadata
      };
    } catch (error) {
      console.error('Resume extraction error:', error);
      return {
        success: false,
        error: error.message,
        rawText: '',
        structuredData: null
      };
    }
  }

  async extractStructuredData(text, jobDetails) {
    try {
      const llmConfig = getDefaultConfiguration();
      
      if (!llmConfig) {
        throw new Error('No LLM configuration found');
      }

      const model = await createChatModel(llmConfig);

      // Create extraction prompt
      const prompt = this.buildExtractionPrompt(text, jobDetails);
      
      // Get AI response
      const response = await model.invoke(prompt);
      const structuredData = this.parseExtractionResponse(response.content);
      
      return structuredData;
    } catch (error) {
      console.error('AI extraction error:', error);
      // Fallback to basic text parsing
      return this.basicTextParsing(text);
    }
  }

  buildExtractionPrompt(text, jobDetails) {
    return `Please extract structured information from the following resume text and return it as JSON.

JOB CONTEXT:
Title: ${jobDetails.title}
Description: ${jobDetails.description || 'N/A'}
Requirements: ${jobDetails.requirements || 'N/A'}

RESUME TEXT:
${text}

Please extract the following information and return as valid JSON:
{
  "fullName": "Full name of the candidate",
  "email": "Email address",
  "phone": "Phone number",
  "currentRole": "Current job title/position",
  "experience": "Years of experience",
  "education": "Educational background",
  "skills": ["skill1", "skill2", "skill3"],
  "workExperience": [
    {
      "company": "Company name",
      "position": "Job title",
      "duration": "Time period",
      "description": "Job description"
    }
  ],
  "projects": [
    {
      "name": "Project name",
      "description": "Project description",
      "technologies": ["tech1", "tech2"]
    }
  ],
  "certifications": ["cert1", "cert2"],
  "languages": ["language1", "language2"],
  "summary": "Professional summary or objective"
}

Please ensure the response is valid JSON and extract as much relevant information as possible.`;
  }

  parseExtractionResponse(response) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (error) {
      console.error('JSON parsing error:', error);
      return {
        fullName: 'Unknown',
        email: 'N/A',
        phone: 'N/A',
        currentRole: 'N/A',
        experience: 'N/A',
        education: 'N/A',
        skills: [],
        workExperience: [],
        projects: [],
        certifications: [],
        languages: [],
        summary: 'Extraction failed'
      };
    }
  }

  basicTextParsing(text) {
    // Basic text parsing as fallback
    const lines = text.split('\n').filter(line => line.trim());
    
    // Extract email
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    const email = emailMatch ? emailMatch[0] : 'N/A';
    
    // Extract phone
    const phoneMatch = text.match(/(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/);
    const phone = phoneMatch ? phoneMatch[0] : 'N/A';
    
    // Extract name (usually first line or first two lines)
    const fullName = lines[0] || 'Unknown';
    
    // Extract skills (look for common skill keywords)
    const skillKeywords = [
      'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'HTML', 'CSS',
      'TypeScript', 'Angular', 'Vue', 'AWS', 'Docker', 'Git', 'MongoDB',
      'PostgreSQL', 'Redis', 'GraphQL', 'REST API', 'Machine Learning',
      'Data Science', 'Agile', 'Scrum', 'DevOps', 'CI/CD'
    ];
    
    const skills = skillKeywords.filter(skill => 
      text.toLowerCase().includes(skill.toLowerCase())
    );
    
    return {
      fullName,
      email,
      phone,
      currentRole: 'N/A',
      experience: 'N/A',
      education: 'N/A',
      skills,
      workExperience: [],
      projects: [],
      certifications: [],
      languages: [],
      summary: lines.slice(0, 3).join(' ')
    };
  }

  async fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsArrayBuffer(file);
    });
  }

  async parsePDF(arrayBuffer) {
    try {      
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
        disableWorker: true
      });
      
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      const metadata = {};
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .filter(item => item.str && item.str.trim())
            .map(item => item.str)
            .join(' ');
          fullText += pageText + '\n';
        } catch (pageError) {
          console.warn(`Error extracting text from page ${pageNum}:`, pageError);
          // Continue with other pages
        }
      }
      
      // Extract metadata
      try {
        const pdfInfo = await pdf.getMetadata();
        if (pdfInfo.info) {
          metadata.title = pdfInfo.info.Title || '';
          metadata.author = pdfInfo.info.Author || '';
          metadata.creator = pdfInfo.info.Creator || '';
          metadata.producer = pdfInfo.info.Producer || '';
          metadata.creationDate = pdfInfo.info.CreationDate || '';
          metadata.modificationDate = pdfInfo.info.ModDate || '';
        }
      } catch (metaError) {
        console.warn('Error extracting PDF metadata:', metaError);
      }
      
      return {
        text: fullText.trim(),
        pages: pdf.numPages,
        metadata
      };
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }
  }

  isPDFFile(file) {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }

  async extractFromMultipleFiles(files) {
    const results = [];
    
    for (const file of files) {
      try {
        const result = await this.extractResumeData(file, {});
        results.push({
          fileName: file.name,
          success: result.success,
          data: result.structuredData,
          error: result.error
        });
      } catch (error) {
        results.push({
          fileName: file.name,
          success: false,
          data: null,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const pdfExtractionService = new PDFExtractionService();
