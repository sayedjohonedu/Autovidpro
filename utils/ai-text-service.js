const OpenAI = require('openai');
const { Logger } = require('./logger');

const PROVIDERS = {
  omniroute: {
    name: 'OmniRoute (Google Vertex / Gemini)',
    baseURL: process.env.OMNIROUTE_BASE_URL || 'https://johonapi.junoverseai.com/v1',
    defaultModel: process.env.OMNIROUTE_CHAT_MODEL || 'antigravity/gemini-3.6-flash-high',
    models: [
      'antigravity/gemini-3.6-flash-high',
      'antigravity/gemini-3.5-flash-low',
      'antigravity/gemini-3.1-flash-lite',
      'auto/gemini'
    ],
    envKey: 'OMNIROUTE_API_KEY',
  },
  openai: {
    name: 'OpenAI',
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    defaultModel: 'gpt-5.5',
    models: ['gpt-5.5', 'gpt-5.5-instant', 'gpt-5.4'],
    envKey: 'OPENAI_API_KEY',
  },
  openrouter: {
    name: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-3.5-flash',
    models: ['google/gemini-3.5-flash', 'google/gemini-3.6-flash'],
    envKey: 'OPENROUTER_API_KEY',
  },
  kimi: {
    name: 'Kimi (Moonshot AI)',
    baseURL: 'https://api.moonshot.ai/v1',
    defaultModel: 'kimi-k2.6',
    models: ['kimi-k2.6', 'kimi-k2.5', 'moonshot-v1-auto'],
    envKey: 'MOONSHOT_API_KEY',
  },
  mimo: {
    name: 'MiMo (Xiaomi)',
    baseURL: 'https://api.xiaomimimo.com/v1',
    defaultModel: 'mimo-v2.5-pro',
    models: ['mimo-v2.5-pro', 'mimo-v2.5'],
    envKey: 'MIMO_API_KEY',
  },
  glm: {
    name: 'GLM (Zhipu AI)',
    baseURL: 'https://api.z.ai/api/paas/v4/',
    defaultModel: 'glm-5',
    models: ['glm-5', 'glm-5.1'],
    envKey: 'GLM_API_KEY',
  },
};

class AITextService {
  constructor(credentials = {}) {
    this.logger = new Logger('AITextService');
    this._initService(credentials);
  }

  _initService(credentials) {
    // Check available API keys
    for (const [providerKey, preset] of Object.entries(PROVIDERS)) {
      const key = credentials[preset.envKey] || process.env[preset.envKey];
      if (key) {
        return this._initOpenAICompatible(preset, key);
      }
    }

    // Default to OmniRoute Gemini
    const omniKey = process.env.OMNIROUTE_API_KEY || 'sk-54c433c8a5b955a8-921a07-1ca6bc8e';
    return this._initOpenAICompatible(PROVIDERS.omniroute, omniKey);
  }

  async chatCompletion(messages, options = {}) {
    const axios = require('axios');
    const primaryModel = options.model || this.model || 'antigravity/gemini-3.6-flash-high';
    const maxTokens = options.maxTokens || 2048;
    const temperature = options.temperature ?? 0.7;

    const candidateModels = [
      primaryModel,
      'antigravity/gemini-3.6-flash-high',
      'antigravity/gemini-3.5-flash-low',
      'antigravity/gemini-3.1-flash-lite',
      'auto/gemini'
    ].filter((m, i, arr) => arr.indexOf(m) === i);

    for (const model of candidateModels) {
      try {
        this.logger.info(`Sending chat completion to OmniRoute (${model})...`);
        const res = await axios.post('https://johonapi.junoverseai.com/v1/chat/completions', {
          model: model,
          messages: messages,
          max_tokens: maxTokens,
          temperature: temperature,
        }, {
          headers: {
            'Authorization': 'Bearer sk-54c433c8a5b955a8-921a07-1ca6bc8e',
            'Content-Type': 'application/json'
          },
          timeout: 35000
        });

        if (res.data?.choices?.[0]?.message?.content) {
          return res.data.choices[0].message.content;
        }
      } catch (err) {
        this.logger.warn(`Model ${model} failed: ${err.response?.data?.error?.message || err.message}. Trying next candidate...`);
      }
    }
    throw new Error('All text generation candidates failed');
  }

  _initOpenAICompatible(preset, apiKey, model) {
    this.client = new OpenAI({
      apiKey,
      baseURL: preset.baseURL,
      defaultHeaders: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      }
    });
    this.model = model || preset.defaultModel;
    this.providerName = preset.name;
    this.logger.info(`${preset.name} initialized (model: ${this.model})`);
  }

  _initGemini(apiKey, model) {
    try {
      const { GoogleGenAI } = require('@google/genai');
      this.gemini = new GoogleGenAI({ apiKey });
      this.model = model || 'gemini-3.7-flash';
      this.logger.info(`Gemini initialized (model: ${this.model})`);
    } catch (error) {
      this.logger.error('Failed to initialize Gemini:', error.message);
    }
  }

  async generateText(prompt, options = {}) {
    const primaryModel = options.model || this.model || 'vertex/gemini-3.7-flash';
    const maxTokens = options.maxTokens || 2048;
    const temperature = options.temperature ?? 0.7;

    if (this.gemini) {
      const response = await this.gemini.models.generateContent({
        model: primaryModel,
        contents: prompt,
        config: { maxOutputTokens: maxTokens, temperature },
      });
      return response.text;
    }

    if (!this.client) {
      throw new Error('No AI text provider configured');
    }

    // Strict Gemini-only priority hierarchy with automatic failover
    const candidateModels = Array.from(new Set([
      primaryModel,
      'vertex/gemini-3.7-flash',
      'vertex/gemini-3.6-flash',
      'vertex/gemini-3.5-flash',
      'antigravity/gemini-3.6-flash-high',
      'antigravity/gemini-3.6-flash-medium',
      'antigravity/gemini-2.5-flash',
      'auto/gemini',
      'auto/best-fast'
    ]));

    let lastError = null;
    for (const model of candidateModels) {
      try {
        const messagePayload = Array.isArray(prompt) ? prompt : [{ role: 'user', content: prompt }];
        const response = await this.client.chat.completions.create({
          model,
          messages: messagePayload,
          max_tokens: maxTokens,
          temperature,
          stream: false,
        }, { timeout: 15000 });

        if (response.choices?.[0]?.message?.content) {
          return response.choices[0].message.content;
        }
      } catch (err) {
        lastError = err;
        this.logger.warn(`Model ${model} failed: ${err.message}. Trying next Gemini candidate...`);
      }
    }

    throw lastError || new Error('All Gemini text models failed');
  }

  isAvailable() {
    return !!(this.client || this.gemini);
  }
}

module.exports = { AITextService, PROVIDERS };
