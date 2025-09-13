import { ChatOpenAI, AzureChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOllama } from "@langchain/ollama";
import { ChatMistralAI } from "@langchain/mistralai";
import { ChatCohere } from "@langchain/cohere";
export async function createChatModel(config) {
    const { provider, baseUrl, model, temperature, apiKey, deploymentName, apiVersion, instanceName } = config;
  
    switch (provider) {
      case "openai": {
        return new ChatOpenAI({
          model,
          temperature: parseFloat(temperature),
          apiKey,
          baseUrl,
        });
      }
      case "anthropic": {
        return new ChatAnthropic({
          model,
          temperature: parseFloat(temperature),
          apiKey,
        });
      }
      case "ollama": {
        return new ChatOllama({
          baseUrl,
          model,
          temperature: parseFloat(temperature),
        });
      }
      case "mistral": {
        return new ChatMistralAI({ model, apiKey });
      }
      case "cohere": {
        return new ChatCohere({ model, apiKey });
      }
      case "azure": {
        return new AzureChatOpenAI({
          azureOpenAIApiKey: apiKey,
          model,
          temperature: parseFloat(temperature),
          azureOpenAIApiDeploymentName: deploymentName,
          azureOpenAIApiVersion: apiVersion,
          azureOpenAIApiInstanceName: instanceName,
        });
      }
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
  