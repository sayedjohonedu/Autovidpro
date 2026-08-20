const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');

class GoogleVertexTTS {
  constructor(options = {}) {
    this.projectId = options.projectId || 'newaug626';
    this.adcPath = options.adcPath || path.join(process.env.HOME || '/Users/sayedjohon', '.config/gcloud/application_default_credentials.json');
    this.cachedToken = null;
    this.tokenExpiry = 0;
    this.httpsAgent = new https.Agent({ family: 4, keepAlive: true });
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
      throw new Error(`ADC credentials not found (no GCLOUD_ADC_JSON env or file at ${this.adcPath})`);
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
        console.warn(`[GoogleVertexTTS] Auth attempt ${attempt} failed: ${err.message}. Retrying...`);
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }

  /**
   * Universal Speech Sanitizer: Strips backticks, quotes, markdown formatting, and punctuation
   * so TTS engines never speak "backquote", "quote", "asterisk", or punctuation names.
   */
  sanitizeSpeechText(text) {
    if (!text) return '';
    let cleaned = text;

    // 1. Strip parenthetical cues: (pause), [applause], (music), etc.
    cleaned = cleaned.replace(/\([a-zA-Z0-9_\s-]+\)/gi, '');
    cleaned = cleaned.replace(/\[[a-zA-Z0-9_\s-]+\]/gi, '');

    // 2. Strip backticks, double quotes, markdown bold/italic, tildes, hashes
    cleaned = cleaned.replace(/[`*#~"“”]/g, '');

    // 3. Strip standalone single quotes or backticks around words while preserving internal contractions (e.g. isn't)
    cleaned = cleaned.replace(/[`'‘]/g, (match, offset, str) => {
      const prev = str[offset - 1];
      const next = str[offset + 1];
      if (match === "'" && prev && next && /[a-zA-Z]/.test(prev) && /[a-zA-Z]/.test(next)) {
        return "'";
      }
      return '';
    });

    // 4. Clean up repo slash notation (e.g. "lodash/lodash" -> "lodash")
    cleaned = cleaned.replace(/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/g, '$2');

    // 5. Normalize hyphens and underscores between words to spaces (e.g. "date-fns" -> "date fns")
    cleaned = cleaned.replace(/(\w)[-_](\w)/g, '$1 $2');

    // 6. Clean up URLs so TTS doesn't read "https colon slash slash"
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/gi, 'the website');

    // 7. Clean up symbols: & -> and, @ -> at, + -> plus, % -> percent
    cleaned = cleaned.replace(/&/g, ' and ');
    cleaned = cleaned.replace(/@/g, ' at ');
    cleaned = cleaned.replace(/\+/g, ' plus ');
    cleaned = cleaned.replace(/%/g, ' percent ');

    // 8. Strip leftover slashes, brackets, braces
    cleaned = cleaned.replace(/[\\\/\[\]{}|^<>]/g, ' ');

    // 9. Normalize multiple dots and whitespace
    cleaned = cleaned.replace(/\.{2,}/g, '.');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  /**
   * Synthesize broadcast speech with Google Cloud TTS (Supports Chirp 3 HD, Journey, Neural2)
   */
  async synthesize(text, outputPath, voiceName = 'en-GB-Chirp3-HD-Aoede') {
    if (outputPath && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
      return outputPath;
    }
    const cleanText = this.sanitizeSpeechText(text);
    const token = await this.getAccessToken();
    const langParts = voiceName.split('-');
    const languageCode = langParts.length >= 2 ? `${langParts[0]}-${langParts[1]}` : 'en-GB';

    const requestBody = {
      input: { text: cleanText },
      voice: {
        languageCode,
        name: voiceName
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.04,
        pitch: 0.0,
        volumeGainDb: 4.0 // Boost voice volume by +4dB for crystal-clear broadcast loudness
      }
    };

    let lastErr = null;
    let response = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await axios.post(
          'https://texttospeech.googleapis.com/v1/text:synthesize',
          requestBody,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'x-goog-user-project': this.projectId,
              'Content-Type': 'application/json'
            },
            httpsAgent: this.httpsAgent,
            timeout: 20000
          }
        );
        if (response.data && response.data.audioContent) {
          break;
        }
      } catch (err) {
        lastErr = err;
        console.warn(`[GoogleVertexTTS] Attempt ${attempt}/3 failed (${err.response?.status || err.message}). Retrying in ${attempt * 1.5}s...`);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, attempt * 1500));
        }
      }
    }

    if (!response || !response.data || !response.data.audioContent) {
      throw new Error(`Google Cloud TTS failed after 3 attempts: ${lastErr?.message || 'No audioContent'}`);
    }

    const rawBuffer = Buffer.from(response.data.audioContent, 'base64');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const tempRawPath = outputPath.replace(/\.mp3$/, `_raw_${Date.now()}.mp3`);
    fs.writeFileSync(tempRawPath, rawBuffer);

    // Apply EBU R128 standard loudness normalization (-14 LUFS) for 100% even vocal leveling
    try {
      const util = require('util');
      const { exec } = require('child_process');
      const execPromise = util.promisify(exec);
      await execPromise(`ffmpeg -y -i "${tempRawPath}" -af "loudnorm=I=-14:LRA=7:TP=-1.5" -c:a libmp3lame -b:a 192k "${outputPath}"`);
      fs.unlinkSync(tempRawPath);
    } catch (e) {
      fs.copyFileSync(tempRawPath, outputPath);
    }
    return outputPath;
  }
}

module.exports = { GoogleVertexTTS };
