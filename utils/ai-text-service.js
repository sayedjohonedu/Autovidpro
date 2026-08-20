const OpenAI = require('openai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { Logger } = require('./logger');

const PROVIDERS = {
  vertexDirect: {
    name: 'Google Vertex AI (Direct $300 Credit)',
    projectId: process.env.VERTEX_PROJECT_ID || 'newaug626',
    location: process.env.VERTEX_LOCATION || 'us-central1',
    defaultModel: process.env.VERTEX_TEXT_MODEL || 'gemini-3.7-flash',
    models: ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.5-pro']
  },
  omniroute: {
    name: 'OmniRoute (Google Vertex / Gemini)',
    baseURL: process.env.OMNIROUTE_BASE_URL || 'https://johonapi.junoverseai.com/v1',
    defaultModel: process.env.OMNIROUTE_CHAT_MODEL || 'antigravity/gemini-3.6-flash-high',
    models: [
      'antigravity/gemini-3.6-flash-high',
      'antigravity/gemini-3.5-flash-low',
      'antigravity/gemini-2.5-flash',
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
  }
};

class AITextService {
  constructor(credentials = {}) {
    this.logger = new Logger('AITextService');
    this.httpsAgent = new https.Agent({ family: 4, keepAlive: true });
    this.projectId = credentials.projectId || process.env.VERTEX_PROJECT_ID || 'newaug626';
    this.location = credentials.location || process.env.VERTEX_LOCATION || 'us-central1';
    this.adcPath = credentials.adcPath || path.join(process.env.HOME || '/Users/sayedjohon', '.config/gcloud/application_default_credentials.json');
    this.cachedToken = null;
    this.tokenExpiry = 0;

    this._initService(credentials);
  }

  _initService(credentials) {
    // 1. Direct Vertex AI Check
    if (process.env.GCLOUD_ADC_JSON || fs.existsSync(this.adcPath)) {
      this.hasVertexDirect = true;
    }

    // 2. OmniRoute Client Init
    const omniKey = credentials.OMNIROUTE_API_KEY || process.env.OMNIROUTE_API_KEY || 'sk-54c433c8a5b955a8-921a07-1ca6bc8e';
    const omniBaseURL = credentials.OMNIROUTE_BASE_URL || process.env.OMNIROUTE_BASE_URL || 'https://johonapi.junoverseai.com/v1';

    this.client = new OpenAI({
      apiKey: omniKey,
      baseURL: omniBaseURL,
      defaultHeaders: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      }
    });
    this.model = process.env.OMNIROUTE_CHAT_MODEL || 'antigravity/gemini-3.6-flash-high';
    this.logger.info(`Initialized (Direct Vertex: ${this.hasVertexDirect ? 'AVAILABLE' : 'OFF'} | OmniRoute: ${omniBaseURL})`);
  }

  async getVertexAccessToken() {
    if (this.cachedToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 60000) {
      return this.cachedToken;
    }

    let creds = null;
    if (process.env.GCLOUD_ADC_JSON) {
      creds = JSON.parse(process.env.GCLOUD_ADC_JSON);
    } else if (fs.existsSync(this.adcPath)) {
      creds = JSON.parse(fs.readFileSync(this.adcPath, 'utf8'));
    } else {
      throw new Error(`ADC credentials not found at ${this.adcPath}`);
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await axios.post('https://oauth2.googleapis.com/token', {
          client_id: creds.client_id,
          client_secret: creds.client_secret,
          refresh_token: creds.refresh_token,
          grant_type: 'refresh_token'
        }, {
          httpsAgent: this.httpsAgent,
          timeout: 10000
        });

        this.cachedToken = response.data.access_token;
        this.tokenExpiry = Date.now() + ((response.data.expires_in || 3600) * 1000);
        return this.cachedToken;
      } catch (err) {
        if (attempt === 3) throw err;
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }

  async generateWithVertexDirect(prompt, options = {}) {
    const token = await this.getVertexAccessToken();
    const primaryModel = options.model || process.env.VERTEX_TEXT_MODEL || 'gemini-3.7-flash';
    const candidateModels = Array.from(new Set([primaryModel, 'gemini-3.7-flash', 'gemini-2.5-flash']));
    const temperature = options.temperature ?? 0.7;

    let promptText = '';
    if (Array.isArray(prompt)) {
      promptText = prompt.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    } else {
      promptText = String(prompt);
    }

    const payload = {
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: options.maxTokens || 4096
      }
    };

    if (options.responseMimeType) {
      payload.generationConfig.responseMimeType = options.responseMimeType;
    }

    let lastError = null;
    for (const model of candidateModels) {
      try {
        const isGlobal = model.startsWith('gemini-3.') || this.location === 'global';
        const endpointHost = isGlobal ? 'aiplatform.googleapis.com' : `${this.location}-aiplatform.googleapis.com`;
        const endpointLoc = isGlobal ? 'global' : this.location;
        const url = `https://${endpointHost}/v1/projects/${this.projectId}/locations/${endpointLoc}/publishers/google/models/${model}:generateContent`;

        const res = await axios.post(url, payload, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          httpsAgent: this.httpsAgent,
          timeout: 30000
        });

        const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return text;
        }
      } catch (err) {
        lastError = err;
        this.logger.warn(`Direct Vertex attempt for ${model} failed (${err.response?.status || err.message}). Trying fallback...`);
      }
    }

    throw lastError || new Error('Direct Vertex returned empty response');
  }

  async generateText(prompt, options = {}) {
    // 1. Tier 1: Direct Google Cloud Vertex AI ($300 Credit, <1.0s latency)
    if (this.hasVertexDirect) {
      try {
        const text = await this.generateWithVertexDirect(prompt, options);
        return text;
      } catch (vertexErr) {
        this.logger.warn(`Tier 1 Direct Vertex AI failed: ${vertexErr.message}. Falling back to Tier 2 OmniRoute...`);
      }
    }

    // 2. Tier 2: OmniRoute Gateway
    const primaryModel = options.model || this.model || 'antigravity/gemini-3.6-flash-high';
    const maxTokens = options.maxTokens || 2048;
    const temperature = options.temperature ?? 0.7;

    const candidateModels = Array.from(new Set([
      primaryModel,
      'antigravity/gemini-3.6-flash-high',
      'antigravity/gemini-3.5-flash-low',
      'antigravity/gemini-2.5-flash',
      'auto/gemini'
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
        }, { timeout: 25000 });

        if (response.choices?.[0]?.message?.content) {
          return response.choices[0].message.content;
        }
      } catch (err) {
        lastError = err;
        this.logger.warn(`OmniRoute model ${model} failed: ${err.message}. Trying next candidate...`);
      }
    }

    throw lastError || new Error('All Gemini text models failed');
  }

  async chatCompletion(messages, options = {}) {
    return this.generateText(messages, options);
  }

  isAvailable() {
    return !!(this.hasVertexDirect || this.client);
  }
}

module.exports = { AITextService, PROVIDERS };
