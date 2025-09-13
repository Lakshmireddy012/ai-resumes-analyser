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

