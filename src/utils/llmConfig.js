// LLM Configuration utilities
export const saveLLMConfiguration = (config) => {
  const existingConfigs = getLLMConfigurations();
  const newConfigs = [...existingConfigs, config];
  localStorage.setItem('llmConfigurations', JSON.stringify(newConfigs));
};

export const getLLMConfigurations = () => {
  const saved = localStorage.getItem('llmConfigurations');
  return saved ? JSON.parse(saved) : [];
};

export const getDefaultConfiguration = () => {
  const configs = getLLMConfigurations();
  return configs.find(config => config.isDefault) || configs[0] || null;
};

export const updateLLMConfiguration = (index, config) => {
  const configs = getLLMConfigurations();
  configs[index] = config;
  localStorage.setItem('llmConfigurations', JSON.stringify(configs));
};

export const deleteLLMConfiguration = (index) => {
  const configs = getLLMConfigurations();
  configs.splice(index, 1);
  localStorage.setItem('llmConfigurations', JSON.stringify(configs));
};

export const setDefaultConfiguration = (index) => {
  const configs = getLLMConfigurations();
  configs.forEach((config, i) => {
    config.isDefault = i === index;
  });
  localStorage.setItem('llmConfigurations', JSON.stringify(configs));
};

// Test connection utility
export const testLLMConnection = async (config) => {
  try {
    const { ChatOllama } = await import('@langchain/community/chat_models/ollama');
    
    const model = new ChatOllama({
      baseUrl: config.baseUrl,
      model: config.model,
      temperature: parseFloat(config.temperature),
    });

    const response = await model.invoke("Hello, this is a test message.");
    return { 
      success: true, 
      message: 'Connection successful!', 
      response: response.content 
    };
  } catch (error) {
    return { 
      success: false, 
      message: `Connection failed: ${error.message}` 
    };
  }
};
