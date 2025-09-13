import { useState, useEffect } from 'react';
import { createChatModel } from '../services/llmFactory';

const Settings = ({ onSave }) => {
  const [configurations, setConfigurations] = useState([]);
  const [currentConfig, setCurrentConfig] = useState({
    name: '',
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    apiKey: '',
    model: 'llama3.1',
    temperature: 0.2,
    maxTokens: 2048,
    isDefault: false,
    // Azure-specific fields
    deploymentName: '',
    apiVersion: '',
    instanceName: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = () => {
    const saved = localStorage.getItem('llmConfigurations');
    if (saved) {
      setConfigurations(JSON.parse(saved));
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const model = await createChatModel(currentConfig);

      const response = await model.invoke("Hello, this is a test message.");
      setTestResult({
        success: true,
        message: "Connection successful!",
        response: response.content,
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `Connection failed: ${error.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (!currentConfig.name.trim()) {
      alert('Please enter a configuration name');
      return;
    }

    const newConfigs = [...configurations];

    if (isEditing) {
      newConfigs[editingIndex] = { ...currentConfig };
    } else {
      if (currentConfig.isDefault) {
        newConfigs.forEach(config => config.isDefault = false);
      }
      newConfigs.push({ ...currentConfig });
    }

    setConfigurations(newConfigs);
    localStorage.setItem('llmConfigurations', JSON.stringify(newConfigs));
    onSave();
    setCurrentConfig({
      name: '',
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
      apiKey: '',
      model: 'llama3.1',
      temperature: 0.7,
      maxTokens: 2048,
      isDefault: false,
      deploymentName: '',
      apiVersion: '2024-02-15-preview',
      instanceName: ''
    });
    setIsEditing(false);
    setEditingIndex(-1);
    setTestResult(null);
  };

  const handleEdit = (index) => {
    const config = configurations[index];
    setCurrentConfig({ ...config });
    setIsEditing(true);
    setEditingIndex(index);
  };

  const handleDelete = (index) => {
    if (window.confirm('Are you sure you want to delete this configuration?')) {
      const newConfigs = configurations.filter((_, i) => i !== index);
      setConfigurations(newConfigs);
      localStorage.setItem('llmConfigurations', JSON.stringify(newConfigs));
    }
  };

  const handleSetDefault = (index) => {
    const newConfigs = configurations.map((config, i) => ({
      ...config,
      isDefault: i === index
    }));
    setConfigurations(newConfigs);
    localStorage.setItem('llmConfigurations', JSON.stringify(newConfigs));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          LLM Configuration
        </h1>
        <p className="text-gray-600">
          Configure your Language Model settings for resume analysis
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Form */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {isEditing ? 'Edit Configuration' : 'Add New Configuration'}
          </h2>

            <form className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Configuration Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={currentConfig.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Local Ollama"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Provider
                </label>
                <select
                  name="provider"
                  value={currentConfig.provider}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ollama">Ollama (Local)</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="mistral">Mistral</option>
                  <option value="cohere">Cohere</option>
                  <option value="azure">Azure</option>
                </select>
              </div>

              {currentConfig.provider === 'azure' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instance Name
                    </label>
                    <input
                      type="text"
                      name="instanceName"
                      value={currentConfig.instanceName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="oai-playground-dev-01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deployment Name
                    </label>
                    <input
                      type="text"
                      name="deploymentName"
                      value={currentConfig.deploymentName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="gpt-4o"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Version
                    </label>
                    <input
                      type="text"
                      name="apiVersion"
                      value={currentConfig.apiVersion}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="2024-02-15-preview"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Base URL
                    </label>
                    <input
                      type="url"
                      name="baseUrl"
                      value={currentConfig.baseUrl}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="http://localhost:11434"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model
                    </label>
                    <input
                      type="text"
                      name="model"
                      value={currentConfig.model}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="llama3.1"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key (if required)
                </label>
                <input
                  type="password"
                  name="apiKey"
                  value={currentConfig.apiKey}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your API key"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temperature
                  </label>
                  <input
                    type="number"
                    name="temperature"
                    value={currentConfig.temperature}
                    onChange={handleInputChange}
                    min="0"
                    max="2"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    name="maxTokens"
                    value={currentConfig.maxTokens}
                    onChange={handleInputChange}
                    min="100"
                    max="4096"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center my-4">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={currentConfig.isDefault}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Set as default configuration
                </label>
              </div>
            </form>

            {/* Test Connection */}
            <div className="pb-4">
              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>

              {testResult && (
                <div className={`mt-2 p-3 rounded-md text-sm ${testResult.success
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
                  }`}>
                  {testResult.message}
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex space-x-3">
              <button
                onClick={handleSave}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
              >
                {isEditing ? 'Update' : 'Save'} Configuration
              </button>
              {isEditing && (
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditingIndex(-1);
                    setCurrentConfig({
                      name: '',
                      provider: 'ollama',
                      baseUrl: 'http://localhost:11434',
                      apiKey: '',
                      model: 'llama3.1',
                      temperature: 0.7,
                      maxTokens: 2048,
                      isDefault: false,
                      deploymentName: '',
                      apiVersion: '2024-02-15-preview',
                      instanceName: ''
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
            </div>
        </div>

        {/* Saved Configurations */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Saved Configurations
          </h2>

          {configurations.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No configurations saved yet
            </p>
          ) : (
            <div className="space-y-3">
              {configurations.map((config, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {config.name}
                        {config.isDefault && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Default
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {config.provider} • {config.model}
                        {config.provider === 'azure' && config.deploymentName && (
                          <span> • {config.deploymentName}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      {!config.isDefault && (
                        <button
                          onClick={() => handleSetDefault(index)}
                          className="text-xs px-2 py-1 text-blue-600 hover:text-blue-800"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(index)}
                        className="text-xs px-2 py-1 text-gray-600 hover:text-gray-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(index)}
                        className="text-xs px-2 py-1 text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
