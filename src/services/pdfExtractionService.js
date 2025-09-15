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

  async extractResumeData(file, jobDetails, resumeFields = {}) {
    try {
      // Extract text from PDF
      const pdfResult = await this.extractTextFromPDF(file);
      
      if (!pdfResult.success) {
        throw new Error(pdfResult.error);
      }

      // Use AI to extract structured resume data
      const resumeData = await this.extractStructuredData(pdfResult.text, jobDetails, resumeFields);
      
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

  async extractStructuredData(text, jobDetails, resumeFields = {}) {
    try {
      const llmConfig = getDefaultConfiguration();
      
      if (!llmConfig) {
        throw new Error('No LLM configuration found');
      }

      const model = await createChatModel(llmConfig);

      // Create extraction prompt
      const prompt = this.buildExtractionPrompt(text, jobDetails, resumeFields);
      
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

  buildExtractionPrompt(text, jobDetails, resumeFields = {}) {
    const schema = {};

    if (resumeFields.contactInformation) {
      schema.fullName = "Full name of the candidate";
      schema.email = "Email address";
      schema.phone = "Phone number";
      schema.address = "Mailing address";
      schema.linkedin = "LinkedIn profile URL";
      schema.github = "GitHub profile URL";
      schema.website = "Personal website or portfolio URL";
    }

    if (resumeFields.professionalSummary) {
      schema.summary = "Professional summary or objective";
      schema.currentRole = "Current job title or role";
      schema.experience = "Total years of experience (number or string)";
    }

    if (resumeFields.education) {
      schema.education = [
        {
          institution: "University or institution name",
          degree: "Degree name",
          fieldOfStudy: "Field of study",
          graduationYear: "YYYY",
          gpa: "GPA if present",
          location: "City, State/Country",
          honors: "Honors if any"
        }
      ];
    }

    if (resumeFields.workExperience) {
      schema.workExperience = [
        {
          company: "Company name",
          position: "Job title",
          startDate: "YYYY-MM if available else best effort",
          endDate: "YYYY-MM or null if current",
          current: false,
          location: "City, State/Country",
          description: "Key responsibilities and scope",
          achievements: ["Achievement 1", "Achievement 2"],
          technologies: ["Tech1", "Tech2"]
        }
      ];
    }

    if (resumeFields.projects) {
      schema.projects = [
        {
          name: "Project name",
          description: "Project description",
          technologies: ["Tech1", "Tech2"],
          url: "Project URL if any",
          date: "YYYY or YYYY-MM if any"
        }
      ];
    }

    if (resumeFields.certifications) {
      schema.certifications = [
        {
          name: "Certification name",
          issuer: "Issuing organization",
          date: "YYYY or YYYY-MM",
          expiryDate: "YYYY or YYYY-MM if applicable"
        }
      ];
    }

    if (resumeFields.languages) {
      schema.languages = [
        { language: "Language name", proficiency: "Basic/Conversational/Fluent/Native" }
      ];
    }

    if (resumeFields.publications) {
      schema.publications = [
        { title: "Title", journal: "Journal/Publisher", date: "YYYY", url: "URL if any" }
      ];
    }

    if (resumeFields.awards) {
      schema.awards = [
        { name: "Award name", issuer: "Organization", date: "YYYY" }
      ];
    }

    if (resumeFields.volunteerExperience) {
      schema.volunteerExperience = [
        {
          organization: "Organization name",
          role: "Volunteer role",
          startDate: "YYYY or YYYY-MM",
          endDate: "YYYY or YYYY-MM",
          description: "What was done"
        }
      ];
    }

    if (Array.isArray(resumeFields.customResumeFields)) {
      resumeFields.customResumeFields.forEach(field => {
        if (field?.name) {
          const key = field.name.toLowerCase().replace(/\s+/g, '_');
          schema[key] = `Value for ${field.name}`;
        }
      });
    }

    const schemaJson = JSON.stringify(schema, null, 2);

    return `You are extracting resume data. Return ONLY valid JSON matching the schema below. Prefer exact facts; do not hallucinate. If unknown, use "N/A" or [] accordingly.

JOB CONTEXT:
Title: ${jobDetails.title}
Description: ${jobDetails.description || 'N/A'}
Requirements: ${jobDetails.requirements || 'N/A'}

SCHEMA TO RETURN:
${schemaJson}

RESUME TEXT:
${text}`;
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
