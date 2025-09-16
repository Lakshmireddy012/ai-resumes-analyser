# AI Resume Analyzer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19.1.1-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1.2-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1.13-38B2AC.svg)](https://tailwindcss.com/)

A powerful, AI-driven web application for analyzing PDF resumes with intelligent insights, scoring, and job matching capabilities. Built with React and supporting multiple Language Model (LLM) providers for flexible AI-powered resume analysis.

## 🚀 Features

### Core Functionality
- **📄 PDF Resume Analysis**: Extract and analyze text from PDF resumes using advanced AI
- **🤖 Multiple LLM Support**: Compatible with Ollama, OpenAI, Anthropic, and other LangChain providers
- **📊 Intelligent Scoring**: AI-powered scoring system (1-10 scale) with detailed breakdowns
- **🎯 Job Matching**: Analyze resumes against specific job requirements and descriptions
- **📈 Bulk Processing**: Process multiple resumes simultaneously for efficient screening
- **⚙️ Customizable Analysis**: Configure which fields to include in analysis output

### How to use

![AI_Resumes_Analyser](https://github.com/user-attachments/assets/b317baa4-1066-410e-9049-fa2a2b7ef1ca)

### Advanced Features
- **🔧 Flexible Configuration**: Easy setup and management of LLM providers
- **💾 Local Storage**: Secure local storage for configurations and analysis results
- **📱 Responsive Design**: Modern, mobile-friendly interface built with Tailwind CSS
- **🔄 Real-time Updates**: Live progress tracking for ongoing analyses
- **📋 Custom Fields**: Add custom analysis fields for specific requirements
- **🔍 Detailed Insights**: Comprehensive analysis including strengths, weaknesses, and recommendations

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite
- **Styling**: Tailwind CSS 4.1.13
- **Routing**: React Router DOM 7.9.0
- **AI Integration**: LangChain.js with multiple provider support
- **PDF Processing**: pdfjs-dist for PDF text extraction
- **Storage**: Browser Local Storage
- **Build Tool**: Vite with hot module replacement

## 📋 Prerequisites

Before running this application, ensure you have:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager
- **LLM Provider** (choose one):
  - **Ollama** (local) - [Installation guide](https://ollama.ai/)
  - **OpenAI API** - [Get API key](https://platform.openai.com/)
  - **Anthropic API** - [Get API key](https://console.anthropic.com/)
  - **Other LangChain providers**

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ai-resume-analyzer.git
cd ai-resume-analyzer
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Configure LLM Provider

#### Option A: Ollama (Local)
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model (e.g., Llama 2)
ollama pull llama2

# Start Ollama
ollama serve
```

#### Option B: OpenAI
1. Get your API key from [OpenAI Platform](https://platform.openai.com/)
2. Configure in the app settings

#### Option C: Anthropic
1. Get your API key from [Anthropic Console](https://console.anthropic.com/)
2. Configure in the app settings

### 4. Start Development Server

```bash
npm run dev
# or
yarn dev
```

### 5. Open in Browser

Navigate to `http://localhost:5173` in your web browser.

## 📖 Usage Guide

### Initial Setup

1. **Configure LLM Settings**
   - Go to Settings page
   - Add your LLM configuration
   - Test the connection
   - Set as default configuration

2. **Start Your First Analysis**
   - Click "Start Analysis" on the home page
   - Upload one or more PDF resume files
   - Configure job details and requirements
   - Select analysis output fields
   - Start the analysis process

### Analysis Configuration

#### Job Details
- **Job Title**: The position you're hiring for
- **Description**: Detailed job description
- **Requirements**: Required skills and qualifications
- **Experience Level**: Years of experience needed
- **Location**: Job location

#### Analysis Fields
Choose which fields to include in your analysis:
- **Basic Info**: Full name, current role, contact information
- **Scoring**: Overall score, skills match, experience match
- **Insights**: Summary, strengths, weaknesses, recommendations
- **Custom Fields**: Add your own analysis criteria

### Bulk Processing

The application automatically handles both single and multiple resume processing:
- Upload one file for individual analysis
- Upload multiple files for batch processing
- All files are processed using the same configuration
- Results are stored and can be viewed individually or compared

## 🏗️ Project Structure

```
ai-resume-analyzer/
├── public/
│   └── vite.svg                 # App icon
├── src/
│   ├── components/
│   │   └── Layout.jsx           # Main layout component
│   ├── pages/
│   │   ├── Home.jsx            # Dashboard with metrics
│   │   ├── Settings.jsx        # LLM configuration
│   │   ├── Analysis.jsx        # Analysis configuration
│   │   └── AnalysisDetails.jsx # Analysis results viewer
│   ├── services/
│   │   ├── aiAnalysisService.js    # AI analysis logic
│   │   └── pdfExtractionService.js # PDF processing
│   ├── utils/
│   │   ├── analysisStorage.js      # Data persistence
│   │   └── llmConfig.js           # LLM configuration
│   ├── App.jsx                 # Main app with routing
│   ├── main.jsx               # App entry point
│   └── index.css              # Global styles
├── index.html                 # HTML template
├── package.json              # Dependencies
├── tailwind.config.js        # Tailwind configuration
├── vite.config.js           # Vite configuration
└── README.md               # This file
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# OpenAI Configuration
VITE_OPENAI_API_KEY=your_openai_api_key_here

# Anthropic Configuration
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Ollama Configuration (if using local)
VITE_OLLAMA_BASE_URL=http://localhost:11434
```

### LLM Provider Settings

#### Ollama
- **Base URL**: `http://localhost:11434` (default)
- **Model**: Any Ollama model (e.g., `llama2`, `codellama`, `mistral`)
- **Temperature**: 0.1-1.0 (recommended: 0.7)

#### OpenAI
- **API Key**: Your OpenAI API key
- **Model**: `gpt-3.5-turbo`, `gpt-4`, `gpt-4-turbo`
- **Temperature**: 0.1-1.0 (recommended: 0.7)

#### Anthropic
- **API Key**: Your Anthropic API key
- **Model**: `claude-3-sonnet-20240229`, `claude-3-opus-20240229`
- **Temperature**: 0.1-1.0 (recommended: 0.7)

## 🚀 Deployment

### Build for Production

```bash
npm run build
# or
yarn build
```

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

### Deploy to Netlify

1. Build the project:
```bash
npm run build
```

2. Deploy the `dist` folder to Netlify

### Deploy to GitHub Pages

1. Install gh-pages:
```bash
npm install --save-dev gh-pages
```

2. Add to package.json:
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

3. Deploy:
```bash
npm run deploy
```

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Structure

- **Components**: Reusable UI components
- **Pages**: Main application pages
- **Services**: Business logic and API calls
- **Utils**: Helper functions and utilities
- **Hooks**: Custom React hooks (if any)

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📊 Performance

### Optimization Features

- **Code Splitting**: Automatic code splitting with Vite
- **Tree Shaking**: Unused code elimination
- **Minification**: Production builds are minified
- **Caching**: Local storage for configuration persistence
- **Lazy Loading**: Components loaded on demand

### Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🔒 Security

### Data Privacy

- **Local Storage**: All data stored locally in browser
- **No Server**: No data sent to external servers (except LLM APIs)
- **API Keys**: Stored securely in browser local storage
- **PDF Processing**: All PDF processing happens client-side

### Best Practices

- Keep API keys secure
- Use environment variables for sensitive data
- Regularly update dependencies
- Review and audit code changes

## 🐛 Troubleshooting

### Common Issues

#### PDF Processing Errors
- Ensure PDF files are not password-protected
- Check file size (recommended: < 10MB)
- Verify PDF is not corrupted

#### LLM Connection Issues
- Verify API keys are correct
- Check network connectivity
- Ensure LLM service is running (for Ollama)

#### Performance Issues
- Close unnecessary browser tabs
- Check available memory
- Use smaller PDF files for testing

### Getting Help

1. Check the [Issues](https://github.com/yourusername/ai-resume-analyzer/issues) page
2. Search existing discussions
3. Create a new issue with detailed information
4. Include error messages and steps to reproduce

## 📈 Roadmap

### Upcoming Features

- [ ] **Export Options**: Export analysis results to CSV, PDF
- [ ] **Advanced Filtering**: Filter and sort analysis results
- [ ] **Comparison View**: Side-by-side resume comparison
- [ ] **Templates**: Pre-configured analysis templates
- [ ] **API Integration**: REST API for external integrations
- [ ] **User Authentication**: Multi-user support
- [ ] **Cloud Storage**: Cloud-based data persistence
- [ ] **Advanced Analytics**: Detailed reporting and insights

### Version History

- **v1.0.0** - Initial release with basic PDF analysis
- **v1.1.0** - Added multiple LLM provider support
- **v1.2.0** - Improved UI and bulk processing
- **v1.3.0** - Added custom fields and job matching

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Clone your fork
3. Install dependencies: `npm install`
4. Create a feature branch
5. Make your changes
6. Run tests: `npm test`
7. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - UI framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [LangChain](https://langchain.com/) - AI integration
- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF processing
- [Vite](https://vitejs.dev/) - Build tool

## 📞 Support

- **Documentation**: [Wiki](https://github.com/yourusername/ai-resume-analyzer/wiki)
- **Issues**: [GitHub Issues](https://github.com/yourusername/ai-resume-analyzer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/ai-resume-analyzer/discussions)
- **Email**: support@ai-resume-analyzer.com

---

**Made with ❤️ for HR professionals and recruiters**

*Streamline your resume screening process with AI-powered insights and intelligent analysis.*
