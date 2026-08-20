# 🏛️ AUTONOMOUS VIDEO & SOCIAL MEDIA AUTOMATION STUDIO
## Master System Architecture & Complete Handover Dossier
**Unified Pipeline: macOS Long-Form Video Studio & Remote Linux Image Generation Engine**
*Last Updated: 2026-08-19*

---

> [!NOTE]
> This file is a direct mirror of [`AUTONOMOUS_VIDEO_AND_SOCIAL_AUTOMATION_MASTER_HANDOVER.md`](file:///Users/sayedjohon/Documents/DEV_AREA/ssh%20linux/automated-segment-github/AUTONOMOUS_VIDEO_AND_SOCIAL_AUTOMATION_MASTER_HANDOVER.md).
> Please refer to that document or this file for the complete master handover and architecture guidelines.

---

## 📌 1. Project Purpose & Ecosystem Overview

This project is the **Autonomous Content Production & Multi-Platform Social Media Studio** for **Sayed Johon / Junoverse AI Tech**. It automatically creates, renders, and publishes high-production videos and graphics across all major platforms with zero human intervention.

The ecosystem is divided into two specialized engines across two environments:

| Content Engine | Primary Environment | Schedule / Trigger | Platforms Targeted |
| :--- | :--- | :--- | :--- |
| **Long-Form Video Studio (This Pipeline)** | **macOS Host** (Apple Silicon GPU) | On-demand / CLI trigger (`node create_compilation_video.js 6 --profile=sayed_johon`) | **YouTube [PUBLIC]**, **Facebook Page**, **LinkedIn**, **Instagram**, **Twitter/X**, **Threads** |
| **Automated Image Generation Engine** | **Remote Linux Server** (`joe@100.86.193.4` in Docker) | Autonomous cron (Every 40–60 minutes) | **Instagram**, **Facebook**, **LinkedIn**, **Twitter/X**, **Threads** |

---

## 💻 2. Workload Allocation Policy

1. **Video Production MUST run on macOS**:
   - Compiling 5–6 minute 1080p 60fps videos requires heavy video demuxing, 3D card motion animations, Screen Studio cursor flight recordings, karaoke subtitle overlays, and FFmpeg video encoding.
   - macOS hardware acceleration (Apple Silicon VideoToolbox + fast unified memory) renders full 6-repo videos in **~15–17 minutes**. Running video rendering on the remote Linux host takes significantly longer.

2. **Image Automation runs on Linux**:
   - The image automation pipeline runs inside Docker containers on the remote Linux PC (`100.86.193.4`). It generates Nano Banana visuals, UI cards, and social posts on a 40–60 minute schedule independently.
   - **Do NOT** run video pipeline builds on Linux; preserve Linux resources for image generation, web scrapers, and the 10-GPU Colab Swarm.

---

## 🎬 3. Video Studio Pipeline Architecture (macOS)

```mermaid
flowchart TD
    A[Scrape GitHub Trending / Target Repos] --> B[Generate Script via GitHubScriptAgent]
    B --> C[10-Rule Universal Speech Sanitizer]
    C --> D[Google Vertex TTS Chirp 3 HD Schedar / OmniVoice]
    D --> E[Subtitles & Word Chunks via SubtitleRenderer]
    B --> F[Curated 177-GIF Library RAG + PlayPhrase Chunks]
    B --> G[Screen Studio Cursor Flights & 3D UI Cards]
    F & G & E --> H[FFmpeg Motion Canvas Assembly]
    H --> I[Vertex AI Nano Banana 2 Custom Thumbnail]
    I --> J[Master 1080p 60fps MP4 Compilation]
    J --> K[Phase 8: Direct YouTube Data API Upload (PUBLIC)]
    K --> L[Phase 10: 2-Wave Multi-Platform Social Broadcast]
```

### Core Subsystems & Guardrails:
* **177 Curated GIF Library (`Assets/Curated_GIFs/`, `utils/curated-gif-library.js`)**:
  - BM25 token relevance scoring, synonym expansion, and randomized candidate shuffling to guarantee 40+ unique GIFs per video with zero repetition.
* **10-Rule Universal Speech Sanitizer (`utils/google-vertex-tts.js`, `agents/github-script-agent.js`)**:
  - Strips backticks (`` ` ``), quotes (`"`, `'`), asterisks (`*`), headers, and cues so TTS treats tool names as clean proper nouns without speaking punctuation artifacts. Preserves natural contractions (`isn't`, `don't`).
* **1px Spacer & Degenerate Image Guard (`create_compilation_video.js`, `utils/ffmpeg-motion-canvas.js`)**:
  - Uses `sharp` to strip 1×33 tracking pixels and tiny badges ($\text{width} \ge 200$, $\text{height} \ge 120$, aspect ratio $0.45\text{–}3.2$). Auto-heals to curated GIFs if degenerate media is found.
* **Zero Black Frames Auto-Healing Guard (`utils/ffmpeg-motion-canvas.js`)**:
  - Post-render luminance validator on sliced cinema/motion clips. If black frames are detected, it automatically swaps in a curated high-contrast GIF.
* **Thumbnail Visual Artist (`utils/thumbnail-studio-generator.js`, `sayed_johon.json`)**:
  - Uses Google Vertex AI Nano Banana 2 (`gemini-3.1-flash-image`) with Sayed Johon's authentic face reference (`data/johon_face.png`) and anti-AI-slop physical props.

---

## 📡 4. 2-Wave Multi-Platform Broadcast Engine

### 🌊 Wave 1: Immediate Video Release (At Video Completion)

| Platform | Channel / Account | What Gets Uploaded | Delivery Method |
| :--- | :--- | :--- | :--- |
| **YouTube** | Junoverse AI Tech | **FULL 1080p Master Video** + Master Thumbnail + Timestamps + Tags + **PUBLIC** status | Direct YouTube Data API v3 (`YouTubeUploader`) |
| **Facebook** | *Latest AI News* (Page) | **FULL 1080p Master Video** + 6-repo breakdown + Timestamps + Links | Buffer Account 2 via GCS CDN |
| **LinkedIn** | *Sayed Al Johon* | **FULL 1080p Master Video** + Professional breakdown + 4K YouTube Link | Buffer Account 1 via GCS CDN |
| **Instagram** | `@sayed_johon` | **FULL Master Video / Reel** + Carousel caption + YouTube Link | Buffer Account 2 via GCS CDN |
| **Twitter / X** | `@johonsayed` | **Adaptive 120s HD Video Teaser** (fits 140s hard limit) + Thread + Link | Buffer Account 1 via GCS CDN |
| **Threads** | `@sayed_johon` | **Adaptive 120s HD Video Teaser** (fits 5m duration cap) + Link | Buffer Account 2 via GCS CDN |

### 🖼️ Wave 2: Social Recap & Community Discussion (+10 Minutes Later)
* **What Gets Posted**: High-Res Master 16:9 Thumbnail Image + Detailed 6-Repository Breakdown (bullets, star ratings, direct GitHub links) + Community Question (*"Which tool are you testing first?"*).
* **Target Channels**: Dispatched to all 5 connected social channels (Facebook, Twitter/X, LinkedIn, Instagram, Threads) to drive long-tail traffic to the YouTube release.

---

## 🔑 5. Credentials & Multi-Account Routing

The system dynamically queries and loads multiple Buffer accounts and Google Cloud Storage:

```env
BUFFER_API_KEY=wCxSi32sR4wzc-GTanEOh6EnDjJ5Pt4EzfLAqyZkf93
BUFFER_API_KEY_SECONDARY=8cY6qBv4DVhR1dAb4XlRpMXfYdk3BM5CqAm_IqbniMi
BUFFER_API_KEYS=wCxSi32sR4wzc-GTanEOh6EnDjJ5Pt4EzfLAqyZkf93,8cY6qBv4DVhR1dAb4XlRpMXfYdk3BM5CqAm_IqbniMi
GCS_BUCKET_NAME=newaug626-render-jobs
DEFAULT_PRIVACY_STATUS=public
YOUTUBE_PRIVACY_STATUS=public
```

### Account Routing Table
1. **Buffer Account 1 (`wCxSi32s...`)**:
   - **X / Twitter**: `@johonsayed` (ID: `69b66e5a7be9f8b1715a273d`)
   - **LinkedIn**: `Sayed Al Johon` (ID: `69b66f727be9f8b1715a29a4`)
2. **Buffer Account 2 (`8cY6qB...` - `sayedjohonedu@gmail.com`)**:
   - **Facebook Page**: `Latest AI News` (ID: `6a8574d9ccaf649a67d55a18`)
   - **Instagram**: `sayed_johon` (ID: `6a848fdaccaf649a67cd7864`)
   - **Threads**: `sayed_johon` (ID: `6a8490c2ccaf649a67cd9763`)
3. **Google Cloud Storage CDN (`newaug626-render-jobs`)**:
   - Provides public high-speed HTTP/2 byte-range streaming URLs (`https://storage.googleapis.com/newaug626-render-jobs/broadcasts/...`) required by Buffer and Meta/X crawlers.

---

## 🗂️ 6. Critical File Maps & Dependency Flow

```
create_compilation_video.js  ───► Master Orchestrator (macOS entry point)
│
├── agents/github-script-agent.js  ───► Multi-repo script & narration synthesis
│   └── 10-Rule Universal Speech Sanitizer
│
├── utils/google-vertex-tts.js     ───► Google Cloud Chirp 3 HD Schedar voiceover
├── utils/omnivoice-tts.js         ───► OmniVoice Sayed Johon cloned voice (optional)
│
├── utils/curated-gif-library.js   ───► 177 Curated GIF Library RAG & scoring
├── utils/gif-motion-fetcher.js    ───► BM25 token matching & synonym expansion
├── utils/ffmpeg-motion-canvas.js  ───► 3D floating cards, scanlines & stitching
├── utils/subtitle-renderer.js     ───► Karaoke subtitle overlay generator
│
├── utils/thumbnail-studio-generator.js ──► Vertex AI Nano Banana 2 Thumbnail
├── utils/youtube-uploader.js      ───► YouTube Data API (Public 1080p uploader)
│
└── src/publishers/universalPublisher.js ──► 2-Wave Social Broadcast (Buffer GraphQL + GCS)
```

---

## 🛠️ 7. Operator Command Cheat Sheet

### Trigger Full 6-Repository Video Production (macOS)
```bash
cd "/Users/sayedjohon/Documents/DEV_AREA/ssh linux/automated-segment-github"
node create_compilation_video.js 6 --profile=sayed_johon
```

### Verify YouTube Status & Thumbnail
```bash
node -e '
const { YouTubeUploader } = require("./utils/youtube-uploader");
async function check() {
  const uploader = new YouTubeUploader();
  await uploader.initialize();
  const res = await uploader.youtube.search.list({ part: "snippet", forMine: true, type: "video", maxResults: 3 });
  for (const item of res.data.items) {
    const v = (await uploader.youtube.videos.list({ part: "snippet,status", id: item.id.videoId })).data.items[0];
    console.log(`- ID: ${v.id} | Title: "${v.snippet.title}" | Status: [${v.status.privacyStatus}]`);
  }
}
check();
'
```

### Test Multi-Platform Social Broadcast Standalone
```bash
node -e '
const { UniversalPublisher } = require("./src/publishers/universalPublisher.js");
async function testBroadcast() {
  const p = new UniversalPublisher();
  await p.fetchChannels(true);
  console.log("Channels:", p.channelsCache.map(c => `${c.service}: ${c.name} (${c.id})`));
}
testBroadcast();
'
```

---

## 🛡️ 8. Handover Safety Checklist for Future AI Agents

1. **NEVER run full video renders on Linux host**: Always execute on macOS.
2. **NEVER allow `UniversalPublisher` to upload directly to YouTube**: YouTube uploading is strictly handled by `YouTubeUploader` in Phase 8 with full metadata and thumbnail. `UniversalPublisher` is isolated to `["twitter", "linkedin", "facebook", "instagram", "threads"]`.
3. **NEVER strip the 10-rule speech sanitizer**: Repository names must be spoken as plain names without quotes or backticks.
4. **NEVER hardcode Buffer Account 1 alone**: Always load both Account 1 and Account 2 keys to ensure all 5 social platforms are reached.
5. **Always preserve the Linux Docker Image Pipeline**: It is an independent scheduled service for image posts.
