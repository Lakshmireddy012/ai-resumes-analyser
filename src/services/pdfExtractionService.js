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
      const enrichedData = this.enrichContactFields(resumeData, pdfResult.text);
      
      return {
        success: true,
        rawText: pdfResult.text,
        structuredData: enrichedData,
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

Formatting rules for contact fields:
- email: must be a valid email pattern, lower-case
- linkedin: full https URL to a profile (e.g., https://www.linkedin.com/in/<handle>)
- github: full https URL to a user/org (e.g., https://github.com/<handle>)
- website: full https URL if present

JOB CONTEXT:
Title: ${jobDetails.title}
Description: ${jobDetails.description || 'N/A'}
Requirements: ${jobDetails.requirements || 'N/A'}

SCHEMA TO RETURN:
${schemaJson}

RESUME TEXT:
${text}`;
  }

  enrichContactFields(data, text) {
    const result = { ...(data || {}) };

    const email = this.extractPrimaryEmail(text);
    const linkedin = this.extractLinkedInUrl(text);
    const github = this.extractGitHubUrl(text);
    const website = this.extractWebsiteUrl(text);

    if (!result.email || result.email === 'N/A') result.email = email || result.email || 'N/A';
    if (!result.linkedin || result.linkedin === 'N/A') result.linkedin = linkedin || result.linkedin || 'N/A';
    if (!result.github || result.github === 'N/A') result.github = github || result.github || 'N/A';
    if (!result.website || result.website === 'N/A') result.website = website || result.website || 'N/A';

    return result;
  }

  extractPrimaryEmail(text) {
    if (!text) return null;
    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex);
    if (!matches || matches.length === 0) return null;
    // Pick the first sensible email
    return matches[0].toLowerCase();
  }

  extractLinkedInUrl(text) {
    if (!text) return null;
    const urlRegex = /(https?:\/\/)?([a-z]{0,3}\.)?linkedin\.com\/(in|pub|profile)\/[a-zA-Z0-9\-_%]+\/?/gi;
    const matches = text.match(urlRegex);
    if (!matches || matches.length === 0) return null;
    return this.normalizeUrl(matches[0]);
  }

  extractGitHubUrl(text) {
    if (!text) return null;
    const urlRegex = /(https?:\/\/)?(www\.)?github\.com\/[A-Za-z0-9\-_.]+\/?/gi;
    const matches = text.match(urlRegex);
    if (!matches || matches.length === 0) return null;
    return this.normalizeUrl(matches[0]);
  }

  extractWebsiteUrl(text) {
    if (!text) return null;
    // Heuristic: look for portfolio/personal site lines if not linkedin/github
    const urlRegex = /(https?:\/\/)[^\s)]+/gi;
    const matches = text.match(urlRegex);
    if (!matches || matches.length === 0) return null;
    const filtered = matches.filter(u => !/linkedin\.com/i.test(u) && !/github\.com/i.test(u));
    if (filtered.length === 0) return null;
    return this.normalizeUrl(filtered[0]);
  }

  normalizeUrl(raw) {
    try {
      let url = raw.trim();
      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }
      const u = new URL(url);
      u.hash = '';
      // Strip tracking params
      ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'].forEach(k => u.searchParams.delete(k));
      return u.toString().replace(/\/$/, '');
    } catch {
      return raw;
    }
  }

  parseExtractionResponse(response) {
    try {
      // If the model returned an object already
      if (typeof response === 'object') {
        return response;
      }

      const text = String(response || '');

      // 1) Try direct parse
      try {
        return JSON.parse(text);
      } catch {}

      // 2) Try fenced json code block
      const fencedJson = this.extractFencedJson(text, true) || this.extractFencedJson(text, false);
      if (fencedJson) {
        const parsed = this.tryParseWithSanitization(fencedJson);
        if (parsed) return parsed;
      }

      // 3) Try first JSON-looking substring between outermost braces
      const braceChunk = this.extractBraceChunk(text);
      if (braceChunk) {
        const parsed = this.tryParseWithSanitization(braceChunk);
        if (parsed) return parsed;
      }

      // 4) Last attempt: sanitize entire text and parse
      const sanitized = this.sanitizeJsonLike(text);
      if (sanitized) {
        try {
          return JSON.parse(sanitized);
        } catch {}
      }

      throw new Error('No valid JSON found in response');
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

  extractFencedJson(text, preferJsonTag = true) {
    if (!text) return null;
    const jsonTagged = /```\s*json\s*\n([\s\S]*?)```/i;
    const anyTagged = /```\s*\n([\s\S]*?)```/i;
    const match = (preferJsonTag ? text.match(jsonTagged) : null) || text.match(anyTagged);
    if (match && match[1]) {
      return match[1].trim();
    }
    return null;
  }

  extractBraceChunk(text) {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      return text.slice(first, last + 1);
    }
    return null;
  }

  tryParseWithSanitization(text) {
    try {
      return JSON.parse(text);
    } catch {}
    const sanitized = this.sanitizeJsonLike(text);
    if (!sanitized) return null;
    try {
      return JSON.parse(sanitized);
    } catch {
      return null;
    }
  }

  sanitizeJsonLike(text) {
    if (!text) return null;
    let s = text.trim();
    // Strip code fences if present
    s = s.replace(/^```[\s\S]*?\n/, '').replace(/```\s*$/, '');
    // Keep only content between first { and last }
    const chunk = this.extractBraceChunk(s);
    if (chunk) s = chunk;
    // Remove trailing commas before } or ]
    s = s.replace(/,(\s*[}\]])/g, '$1');
    // Quote single-quoted keys: {'key': ...} -> {"key": ...}
    s = s.replace(/([,{]\s*)'([^'\n\r]+?)'\s*:/g, '$1"$2":');
    // Quote single-quoted string values: : 'value' -> : "value"
    s = s.replace(/:\s*'([^'\n\r]*?)'/g, ': "$1"');
    // Quote unquoted keys: { key: ... } -> { "key": ... }
    s = s.replace(/([,{]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":');
    // Normalize quotes in URLs possibly broken by replacement
    s = s.replace(/\"(https?:[^\"]*?)\"/g, '"$1"');
    return s;
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
