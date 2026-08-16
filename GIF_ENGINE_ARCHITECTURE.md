# 🎬 AutoVidPro: Broadcast-Grade Automated Video Engine

> **Repository**: [`https://github.com/sayedjohonedu/Autovidpro`](https://github.com/sayedjohonedu/Autovidpro)  
> **Channel Destination**: "Phone Farming UAE" (`UChJV1G54czn1eweUD-G_Rlw`)  
> **Infrastructure**: OmniRoute + Google Vertex AI + Colab 4x GPU Cluster + GitHub Actions CI/CD  

---

## 📌 1. System Architecture & Logic Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 1. SCRIPT & VISUAL PACING (Gemini 3.7 / 3.6 Flash via OmniRoute Gateway)        │
│    • Deconstructs topics into 3 punchy educational scenes (Vox / Kurzgesagt)     │
│    • Enforces tight pacing: max ≤3.6s per visual beat (18–25 GIF beats/video)   │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 2. ULTRA-REALISTIC VOICE NARRATION (Google Cloud / Vertex AI Journey Voice)     │
│    • Voice: en-US-Journey-F / en-US-Journey-D with IPv4 keep-alive connection   │
│    • Generates studio narration + accurate duration timestamps for subtitles     │
│    • Uses project newaug626 ($300 credit) via ~/.config/gcloud or GCLOUD_ADC_JSON│
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 3. MULTI-SOURCE MOTION GIF ENGINE (utils/gif-motion-fetcher.js)                 │
│    • Tier 1: Universal Web Engine (Direct Tenor, GIPHY, Reddit scraping, 0 keys)│
│    • Tier 2: Remote Linux SearXNG & Agent-Reach scraper (joe@100.86.193.4)       │
│    • Tier 3: Direct Tenor v2 & GIPHY v1 fallback APIs                           │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 4. ASPECT-ADAPTIVE FLOATING CARD COMPOSITOR (utils/ffmpeg-motion-canvas.js)     │
│    • Probes native media dimensions (W, H) to preserve exact aspect ratio       │
│    • Generates procedural Sharp SVG frame with sleek 6.5px white border         │
│    • Applies soft gaussian drop shadow + 28px rounded corners (zero zoom/crop)  │
│    • Composites framed card over looping background video (Assets/Backgrounds/) │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 5. AUDIO & SUBTITLE SUITE                                                       │
│    • Kinetic Captions: Frosted pill subtitles with bright yellow highlights ASS │
│    • Studio BGM: Random selection from Assets/BGM/ with -18dB speech ducking    │
│    • Transition SFX: Random whooshes/clicks from Assets/Transitions/ (20% vol)  │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 6. OFFLOADED RENDERING BACKENDS                                                 │
│    • Google Colab GPU Cluster (4x 16GB Tesla T4 GPUs = 64GB total VRAM)         │
│    • GitHub Actions Cloud Runner (Headless Ubuntu 4-core, 10Gbps pipeline)      │
│    • Docker Microservice / Local Mac Dev Runner                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 2. Key Components & File Directory

| Component | Path | Description |
| :--- | :--- | :--- |
| **Pipeline Runner** | [`create_gif_explainer_video.js`](file:///Users/sayedjohon/Documents/DEV_AREA/ssh%20linux/youtube-automation-agent/create_gif_explainer_video.js) | Main production script coordinating script, audio, GIFs, and FFmpeg assembly. |
| **Floating Card Compositor** | [`utils/ffmpeg-motion-canvas.js`](file:///Users/sayedjohon/Documents/DEV_AREA/ssh%20linux/youtube-automation-agent/utils/ffmpeg-motion-canvas.js) | Aspect-adaptive card builder with Sharp SVG masks, borders, and drop-shadows. |
| **Google Journey Voice** | [`utils/google-vertex-tts.js`](file:///Users/sayedjohon/Documents/DEV_AREA/ssh%20linux/youtube-automation-agent/utils/google-vertex-tts.js) | Google Cloud Vertex TTS client supporting local ADC and `GCLOUD_ADC_JSON` env. |
| **GIF Fetcher** | [`utils/gif-motion-fetcher.js`](file:///Users/sayedjohon/Documents/DEV_AREA/ssh%20linux/youtube-automation-agent/utils/gif-motion-fetcher.js) | Multi-candidate GIF/MP4 motion scraper with search fallbacks. |
| **Kinetic Captions** | [`utils/subtitle-renderer.js`](file:///Users/sayedjohon/Documents/DEV_AREA/ssh%20linux/youtube-automation-agent/utils/subtitle-renderer.js) | Generates ASS frosted pill subtitles with `#FFE600` keyword highlighting. |
| **Colab GPU Dispatcher** | [`scripts/colab_video_worker.py`](file:///Users/sayedjohon/Documents/DEV_AREA/ssh%20linux/youtube-automation-agent/scripts/colab_video_worker.py) | Python CLI worker dispatching rendering jobs to `colab-pool` on Linux. |
| **GitHub Actions** | [`.github/workflows/render-video.yml`](file:///Users/sayedjohon/Documents/DEV_AREA/ssh%20linux/youtube-automation-agent/.github/workflows/render-video.yml) | Headless cloud rendering CI/CD workflow. |
| **Asset Library** | `Assets/BGM/`, `Assets/Transitions/`, `Assets/Backgrounds/` | Self-contained audio and video media files. |

---

## ⚡ 3. Offload Rendering Options

### Option A: Google Colab 4-Account GPU Cluster
Managed by `colab-pool` on the remote Linux server (`joe@100.86.193.4`).

* **Hardware**: 4 Google accounts, each with a free **16GB NVIDIA Tesla T4 GPU (64GB total VRAM)**.
* **Failover Logic**: Automatically selects the first idle account; fails over upon quota exhaustion.
* **Dispatch Command**:
```bash
python3 scripts/colab_video_worker.py --script "node create_gif_explainer_video.js"
```
* **Status Check**:
```bash
ssh joe@100.86.193.4 "/home/joe/.local/bin/colab-pool status"
```

---

### Option B: GitHub Actions Cloud Rendering
Runs on GitHub's cloud Linux infrastructure (`ubuntu-latest`) with 2,000 free minutes/month.

* **Repository**: [`sayedjohonedu/Autovidpro`](https://github.com/sayedjohonedu/Autovidpro)
* **Configured Secrets**:
  * `OMNIROUTE_API_KEY`: Vertex AI & Gemini scripting gateway token.
  * `GCLOUD_ADC_JSON`: Google Cloud Journey Voice ADC credentials.
* **Trigger via GitHub CLI**:
```bash
gh workflow run render-video.yml --repo sayedjohonedu/Autovidpro
```
* **Trigger via GitHub Web**: Go to `Actions` tab ➔ `Cloud Video Renderer` ➔ `Run workflow`.
* **Download Video**: Artifacts are automatically attached to the completed workflow run as `generated-explainer-video`.

---

### Option C: Local / Docker Rendering
* **Local Run**:
```bash
node create_gif_explainer_video.js
```
* **Docker Container**:
```bash
docker-compose up --build -d
```

---

## 🔑 4. Environment Configuration (`.env`)

```env
PORT=3456
NODE_ENV=production

# OmniRoute AI Gateway (Gemini 3.7 / 3.6 Flash)
OMNIROUTE_BASE_URL=https://johonapi.junoverseai.com/v1
OMNIROUTE_API_KEY=sk-54c433c8a5b955a8-921a07-1ca6bc8e
OMNIROUTE_CHAT_MODEL=vertex/gemini-3.7-flash
OMNIROUTE_IMAGE_MODEL=antigravity/gemini-3.1-flash-image

# Google Cloud Quota Project ($300 Credit)
GCLOUD_PROJECT_ID=newaug626

# Optional API Keys (Leave empty to use 0-key Universal Search)
TENOR_API_KEY=
GIPHY_API_KEY=
```

---

## 💡 5. Guidelines for Future AI Agents

1. **Avoid Polling Loops**: Video renders take 1–3 minutes. Never poll in a tight loop to avoid burning model tokens.
2. **Preserve Asset Paths**: Always reference assets from `Assets/` relative to project root.
3. **Pacing Rule**: Keep GIF beats $\le 3.6\text{s}$ to ensure high audience retention.
4. **Voice Fallback**: Google Journey Voice uses `~/.config/gcloud` locally and `GCLOUD_ADC_JSON` in cloud CI environments.
