const axios = require('axios');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const sharp = require('sharp');
const { Logger } = require('./logger');

/**
 * Thumbnail Studio Generator (Multi-Archetype Viral YouTube Studio Engine)
 * Dual-tier YouTube thumbnail generator:
 * 1. Google Vertex AI (gemini-3.1-flash-image / gemini-2.5-flash-image) with native 16:9 imageConfig & Character Sheet multimodal reference
 * 2. OmniRoute Antigravity (antigravity/gemini-3.1-flash-image, gemini/imagen-4.0-generate-001) fallback
 * 3. Gemini SDK / OpenAI DALL-E tertiary fallback
 */
class ThumbnailStudioGenerator {
  constructor(options = {}) {
    this.logger = new Logger('ThumbnailStudio');
    this.projectId = options.projectId || process.env.VERTEX_PROJECT_ID || 'newaug626';
    this.location = options.location || process.env.VERTEX_LOCATION || 'us-central1';
    this.model = options.model || 'gemini-3.1-flash-image';
    this.fallbackVertexModel = 'gemini-2.5-flash-image';
    this.adcPath = options.adcPath || path.join(process.env.HOME || '/Users/sayedjohon', '.config/gcloud/application_default_credentials.json');
    this.characterRefPath = options.characterRefPath || path.join(__dirname, '..', 'Assets', 'Character Reference.png');
    this.cachedToken = null;
    this.tokenExpiry = 0;
    this.httpsAgent = new https.Agent({ family: 4, keepAlive: true });
    this.httpAgent = new http.Agent({ family: 4, keepAlive: true });

    // OmniRoute config
    this.omnirouteApiKey = options.omnirouteApiKey || process.env.OMNIROUTE_API_KEY || 'sk-54c433c8a5b955a8-921a07-1ca6bc8e';
    this.omnirouteBaseURLs = [
      process.env.OMNIROUTE_BASE_URL,
      'http://100.86.193.4:20229/v1',
      'https://johonapi.junoverseai.com/v1'
    ].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i);
  }

  /**
   * Acquire or refresh Google Cloud OAuth2 Access Token
   */
  async getAccessToken() {
    if (this.cachedToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 60000) {
      return this.cachedToken;
    }

    let creds = null;
    if (process.env.GCLOUD_ADC_JSON) {
      creds = JSON.parse(process.env.GCLOUD_ADC_JSON);
    } else if (fs.existsSync(this.adcPath)) {
      creds = JSON.parse(fs.readFileSync(this.adcPath, 'utf8'));
    } else {
      throw new Error(`Google Cloud ADC credentials not found at ${this.adcPath}`);
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

  /**
   * Complete catalog of High-CTR Thumbnail Archetypes (Extracted from Gemini Gems + White Studio Engine)
   */
  getArchetypes() {
    return [
      {
        id: 'white_studio_dotgrid',
        name: 'White Studio Micro Dot-Grid',
        description: 'Clean high-key commercial studio, black micro dot-grid wall, large matte-black 3D letters, tangible physical prop on floor, dominant host portrait covering right 45%.'
      },
      {
        id: 'total_chaos',
        name: 'Total Chaos & High Adrenaline',
        description: 'Explosions of fire, sparks, lightning striking, embers flying, urgent terrified/shocked expression, glowing high-energy device, massive 3D gold text.'
      },
      {
        id: 'neon_mystery',
        name: 'Neon Mystery & Tech Discovery',
        description: 'Dark cinematic backdrop, radioactive neon outline (cyan/purple/toxic green), steam rising from glowing mysterious hardware, 3D metallic text.'
      },
      {
        id: 'versus_split',
        name: 'Versus / Split Showdown',
        description: 'Visual split screen (Red vs Blue), contrasting tech elements on left vs right, rivalry/conflict expression, massive 3D split typography.'
      },
      {
        id: 'scale_and_awe',
        name: 'Scale & Awe Forced Perspective',
        description: 'Subject holding an unbelievable giant or microscopic version of the chip/device in hands, tilt-shift bokeh, shock expression, massive 3D text.'
      },
      {
        id: 'minimalist_pop',
        name: 'Minimalist Pop & High Saturation',
        description: 'Solid saturated bright backdrop (electric yellow or vibrant cyan), extreme close-up face, 1 massive 3D prop, ultra-clean punchy pop typography.'
      },
      {
        id: 'cinematic_high_octane',
        name: 'Junoverse 3.0 High-Octane Action',
        description: '14mm/24mm wide angle low-angle hero shot, anamorphic lens flares, teal & orange cinematic grit, volumetric god rays, intense dynamic pose, heavy metallic/glowing 3D text.'
      }
    ];
  }

  /**
   * Select mood from character reference sheet
   */
  getMoodPrompt(mood = 'skeptical') {
    const moods = {
      skeptical: 'an expressive skeptical sideways glance with her head tilted and a knowing subtle smirk looking toward the center',
      secret: 'making an expressive secret whisper "shhh" gesture with one finger on her lips looking directly at the camera with an intriguing smirk',
      shocked: 'a shocked, mindblown expression with one hand on her forehead looking directly at the camera in disbelief with wide eyes',
      terrified: 'a terrified urgent expression with wide eyes and sweat running down face looking directly at the danger',
      excited: 'an excited smiling expression pointing with index finger directly toward the center headline text',
      thinking: 'a thoughtful, curious expression resting her chin gently on her hand looking upward',
      laughing: 'a burst of joyful laughter with eyes crinkling and head tilted back',
      triumph: 'an intense, triumphant fierce focus looking forward like a master engineer who unlocked a secret code'
    };
    return moods[mood] || moods.skeptical;
  }

  /**
   * Build High-CTR Multi-Archetype Prompt following exact Gem instructions & formulas
   */
  buildPrompt({
    archetypeId = 'white_studio_dotgrid',
    hookText = 'AI REPO',
    mood = 'shocked',
    customProp = null,
    customAction = null,
    customBackground = null
  }) {
    const moodDesc = this.getMoodPrompt(mood);
    const technicalKeywords = 'hyper-realistic, 8k resolution, octane render, ray tracing, volumetric lighting, subsurface scattering, bokeh, vibrant saturation, 3D bold typography, cinematic shading, detailed texture, masterpiece.';
    const faceAnchor = 'Using the face of the uploaded reference image, face is 100% identical and exactly similar to the reference photo face (exact same female creator with wavy dark brown hair and warm brown eyes)';

    switch (archetypeId) {
      case 'total_chaos': {
        const prop = customProp || 'a glowing, sparking industrial microchip CPU radiating high-voltage electric energy';
        const action = customAction || `holding ${prop}, with ${moodDesc}`;
        const bg = customBackground || 'a massive dramatic explosion of fire, sparks, lightning bolts striking across the back, and flying fiery embers';
        return `${faceAnchor}. Subject is ${action}. BACKGROUND: ${bg}. LIGHTING: Dramatic high-contrast red-and-orange rim lighting, atmospheric volumetric smoke and particle glow. TEXT OVERLAY: Massive 3D bold Gold text reading "${hookText}" floating dramatically behind the subject. ${technicalKeywords} --ar 16:9`;
      }

      case 'neon_mystery': {
        const prop = customProp || 'a glowing radioactive classified server module with pulsing cyan data circuits and steam rising';
        const action = customAction || `inspecting ${prop} with ${moodDesc}`;
        const bg = customBackground || 'a dark high-tech void with glowing radioactive warning glyphs and mysterious volumetric haze';
        return `${faceAnchor}. Subject is ${action}. BACKGROUND: ${bg}. LIGHTING: High-tech toxic green, cyan, and danger red glow with a sharp neon rim outline around the subject, deep cinematic shadows. TEXT OVERLAY: Massive 3D metallic chrome text reading "${hookText}" floating in the center. ${technicalKeywords} --ar 16:9`;
      }

      case 'versus_split': {
        const prop = customProp || 'a broken outdated legacy floppy disk on the red left side and a pristine glowing quantum processor on the blue right side';
        const action = customAction || `standing right in the center divider between two contrasting worlds with ${moodDesc}`;
        const bg = customBackground || 'a dramatic visual vertical split-screen with fiery explosive Red energy on the left side versus clean glowing Electric Cyan-Blue laser grid on the right side';
        return `${faceAnchor}. Subject is ${action}, holding ${prop}. BACKGROUND: ${bg}. LIGHTING: Dual-tone split rim lighting (intense red on subject\'s left side, sharp electric blue on subject\'s right side). TEXT OVERLAY: Massive 3D split-colored bold typography reading "${hookText}" positioned squarely across the center divide. ${technicalKeywords} --ar 16:9`;
      }

      case 'scale_and_awe': {
        const prop = customProp || 'a colossal, building-sized mechanical robot hand gently resting a glowing AI microchip into her hands';
        const action = customAction || `holding an unbelievable giant version of ${prop} with forced perspective, showing ${moodDesc}`;
        const bg = customBackground || 'a cinematic tech laboratory with tilt-shift depth-of-field blur emphasizing extreme scale differences';
        return `${faceAnchor}. Subject is ${action}. BACKGROUND: ${bg}. LIGHTING: Volumetric soft directional studio spotlights with delicate edge rim light. TEXT OVERLAY: Massive ultra-bold 3D architectural typography reading "${hookText}" firmly anchored beside the subject. ${technicalKeywords} --ar 16:9`;
      }

      case 'minimalist_pop': {
        const prop = customProp || 'an oversized tactile vibrant 3D yellow exclamation mark block and a physical mechanical keycap';
        const action = customAction || `in an extreme close-up portrait beside ${prop}, showing ${moodDesc}`;
        const bg = customBackground || 'a solid bright electric yellow and radiant cyan minimalist high-saturation studio backdrop';
        return `${faceAnchor}. Subject is ${action}. BACKGROUND: ${bg}. LIGHTING: Crisp commercial pop studio lighting with razor-sharp contact shadows and saturated colors. TEXT OVERLAY: Massive ultra-bold 3D pop typography reading "${hookText}" placed prominently. ${technicalKeywords} --ar 16:9`;
      }

      case 'cinematic_high_octane': {
        const prop = customProp || 'wielding a glowing futuristic data hammer smashing through a pile of obsolete server racks with flying circuit fragments';
        const action = customAction || `in a dynamic low-angle 14mm wide-angle hero action pose with ${moodDesc}`;
        const bg = customBackground || 'a dark cinematic swirling vortex of golden data streams with anamorphic lens flares and cinematic grit';
        return `${faceAnchor}. Subject is ${action}, ${prop}. BACKGROUND: ${bg}. LIGHTING: High-contrast teal and orange cinematic lighting, volumetric god rays, anamorphic lens flares. TEXT OVERLAY: Aggressive 3D metallic and glowing neon typography reading "${hookText}". ${technicalKeywords} --ar 16:9`;
      }

      case 'white_studio_dotgrid':
      default: {
        const prop = customProp || 'an oversized industrial brushed-metal robotic claw holding a glowing microchip CPU with realistic mechanical textures and wires, resting firmly on the white studio floor';
        return `A viral 16:9 YouTube tech thumbnail in a clean, minimalist high-key white commercial studio setting.
BACKGROUND & ENVIRONMENT: Pure bright off-white studio background covered with an ultra-fine, delicate technical black micro dot-grid pattern. Clean white studio floor with soft realistic ambient contact shadows and subtle gloss reflections.
RIGHT SIDE: ${faceAnchor}, in a large, tight, dominant close-up portrait completely covering the right 45% of the 16:9 frame from the top edge down to the bottom border with no white gaps above or below her, showing ${moodDesc}.
CENTER: Large solid physical matte-black 3D architectural block letters standing firmly upright on the studio floor reading "${hookText}", casting realistic soft contact shadows and reflections onto the white studio floor.
LEFT SIDE: ${prop}.
COMPOSITION & MOTION ACCENTS: Subtle floating translucent code snippet windows and miniature data circuit glyphs drifting in soft cinematic directional motion blur and shallow depth-of-field across the mid-ground, adding velocity while maintaining clean Rule of Thirds balance.
STYLE & QUALITY: Tangible real-world physical textures, editorial commercial studio photography, crisp 8k resolution, clean high-key composition, zero generic cyberpunk circuits, authentic physical materials, ${technicalKeywords} --ar 16:9`;
      }
    }
  }

  /**
   * Save native 16:9 image buffer
   */
  async saveImage(imageBuffer, outputPath) {
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(outputPath, imageBuffer);
  }

  /**
   * Primary generator: Google Vertex AI (Native 16:9 via imageConfig.aspectRatio)
   */
  async generateWithVertexAI(promptText, outputPath) {
    const token = await this.getAccessToken();
    let refB64 = null;
    if (fs.existsSync(this.characterRefPath)) {
      refB64 = fs.readFileSync(this.characterRefPath).toString('base64');
    }

    const userParts = [{ text: promptText }];
    if (refB64) {
      userParts.push({
        inlineData: {
          mimeType: 'image/png',
          data: refB64
        }
      });
    }

    const modelsToTry = [this.model, this.fallbackVertexModel];

    for (const model of modelsToTry) {
      try {
        const url = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${model}:generateContent`;
        this.logger.info(`Sending thumbnail request to Google Vertex AI (${model}) with native 16:9 aspect ratio...`);
        const response = await axios.post(url, {
          contents: [{ role: 'user', parts: userParts }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
            imageConfig: {
              aspectRatio: '16:9'
            }
          }
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          httpsAgent: this.httpsAgent,
          timeout: 60000
        });

        const parts = response.data?.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            const rawBuffer = Buffer.from(part.inlineData.data, 'base64');
            await this.saveImage(rawBuffer, outputPath);
            this.logger.info(`✅ Native 16:9 thumbnail generated via Vertex AI (${model}) -> ${outputPath}`);
            return { provider: 'vertex_ai', model, outputPath };
          }
        }
      } catch (err) {
        this.logger.warn(`Vertex AI (${model}) attempt failed: ${err.response?.data?.error?.message || err.message}`);
      }
    }

    throw new Error('All Vertex AI model endpoints failed');
  }

  /**
   * Secondary generator: OmniRoute Antigravity / Gemini Image models
   */
  async generateWithOmniRoute(promptText, outputPath) {
    const candidateModels = [
      'antigravity/gemini-3.1-flash-image',
      'gemini/imagen-4.0-generate-001',
      'nvidia/black-forest-labs/flux.1-dev'
    ];

    for (const baseURL of this.omnirouteBaseURLs) {
      const isHttps = baseURL.startsWith('https');
      const agent = isHttps ? this.httpsAgent : this.httpAgent;

      for (const model of candidateModels) {
        try {
          this.logger.info(`Trying OmniRoute thumbnail generation (${baseURL} - ${model})...`);
          const response = await axios.post(`${baseURL}/images/generations`, {
            model: model,
            prompt: promptText,
            n: 1,
            size: '1024x1024',
            response_format: 'b64_json'
          }, {
            headers: {
              'Authorization': `Bearer ${this.omnirouteApiKey}`,
              'Content-Type': 'application/json'
            },
            [isHttps ? 'httpsAgent' : 'httpAgent']: agent,
            timeout: 50000
          });

          const data = response.data?.data?.[0];
          if (data?.b64_json) {
            const rawBuffer = Buffer.from(data.b64_json, 'base64');
            await this.saveImage(rawBuffer, outputPath);
            this.logger.info(`✅ Thumbnail generated via OmniRoute (${model}) -> ${outputPath}`);
            return { provider: 'omniroute', model, outputPath };
          } else if (data?.url) {
            const imgRes = await axios.get(data.url, { responseType: 'arraybuffer', timeout: 20000 });
            await this.saveImage(Buffer.from(imgRes.data), outputPath);
            this.logger.info(`✅ Thumbnail generated via OmniRoute URL (${model}) -> ${outputPath}`);
            return { provider: 'omniroute', model, outputPath };
          }
        } catch (err) {
          this.logger.warn(`OmniRoute ${model} failed on ${baseURL}: ${err.response?.data?.error?.message || err.message}`);
        }
      }
    }

    throw new Error('OmniRoute image generation candidates exhausted');
  }

  /**
   * Tertiary generator: Direct Gemini SDK or OpenAI DALL-E
   */
  async generateWithFallback(promptText, outputPath) {
    if (process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenAI } = require('@google/genai');
        const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const res = await gemini.models.generateContent({
          model: 'gemini-3.1-flash-image',
          contents: promptText
        });
        const imgPart = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
        if (imgPart) {
          const rawBuffer = Buffer.from(imgPart.inlineData.data, 'base64');
          await this.saveImage(rawBuffer, outputPath);
          return { provider: 'gemini_direct', model: 'gemini-3.1-flash-image', outputPath };
        }
      } catch (e) {
        this.logger.warn(`Gemini direct failed: ${e.message}`);
      }
    }

    if (process.env.OPENAI_API_KEY) {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await openai.images.generate({
        model: 'dall-e-3',
        prompt: promptText,
        n: 1,
        size: '1792x1024',
        response_format: 'b64_json'
      });
      if (res.data?.[0]?.b64_json) {
        const rawBuffer = Buffer.from(res.data[0].b64_json, 'base64');
        await this.saveImage(rawBuffer, outputPath);
        return { provider: 'openai_dalle3', model: 'dall-e-3', outputPath };
      }
    }

    throw new Error('All thumbnail generation providers failed');
  }

  /**
   * Generate Native 16:9 YouTube Thumbnail with automatic cascading fallback
   */
  async generateThumbnail({
    archetypeId = 'white_studio_dotgrid',
    hookText = 'AI REPO',
    mood = 'shocked',
    customProp = null,
    customAction = null,
    customBackground = null,
    outputPath
  }) {
    const promptText = this.buildPrompt({
      archetypeId,
      hookText,
      mood,
      customProp,
      customAction,
      customBackground
    });

    const finalOutputPath = outputPath || path.join(
      __dirname,
      '..',
      'uploads',
      'thumbnails',
      `thumb_${archetypeId}_${Date.now()}.png`
    );

    this.logger.info(`Building thumbnail [Archetype: ${archetypeId} | Hook: "${hookText}" | Mood: ${mood}]`);

    // Tier 1: Try Direct Google Vertex AI (Native 16:9 via imageConfig.aspectRatio)
    try {
      const res = await this.generateWithVertexAI(promptText, finalOutputPath);
      return {
        ...res,
        archetypeId,
        hookText,
        mood,
        promptText
      };
    } catch (vertexErr) {
      this.logger.warn(`Tier 1 Vertex AI failed: ${vertexErr.message}. Falling back to Tier 2 OmniRoute Antigravity...`);
    }

    // Tier 2: Try OmniRoute Antigravity (Gemini 3.1 Image / Imagen)
    try {
      const res = await this.generateWithOmniRoute(promptText, finalOutputPath);
      return {
        ...res,
        archetypeId,
        hookText,
        mood,
        promptText
      };
    } catch (omniErr) {
      this.logger.warn(`Tier 2 OmniRoute failed: ${omniErr.message}. Falling back to Tier 3 Fallback...`);
    }

    // Tier 3: Try Direct Gemini / OpenAI
    const res = await this.generateWithFallback(promptText, finalOutputPath);
    return {
      ...res,
      archetypeId,
      hookText,
      mood,
      promptText
    };
  }
}

module.exports = { ThumbnailStudioGenerator };
