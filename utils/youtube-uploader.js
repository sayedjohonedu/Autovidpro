const fs = require('fs');
const path = require('path');
const { CredentialManager } = require('./credential-manager');
const { Logger } = require('./logger');

class YouTubeUploader {
  constructor() {
    this.logger = new Logger('YouTubeUploader');
    this.credentials = new CredentialManager();
    this.youtube = null;
  }

  /**
   * Initialize YouTube API connection
   */
  async initialize() {
    await this.credentials.initialize();
    this.youtube = this.credentials.getYouTubeClient();
    this.logger.info('YouTube API Client Initialized');
  }

  /**
   * Upload video and optional thumbnail to YouTube
   * 
   * @param {Object} params
   * @param {string} params.videoPath - Path to .mp4 video file
   * @param {string} params.thumbnailPath - Path to .png/.jpg thumbnail
   * @param {string} params.title - YouTube video title (<= 100 chars)
   * @param {string} params.description - YouTube video description
   * @param {Array<string>} params.tags - Array of keyword tags
   * @param {string} params.privacyStatus - 'unlisted' | 'private' | 'public'
   * @param {string} params.categoryId - YouTube category (default: '28' -> Science & Technology)
   */
  async uploadVideo({
    videoPath,
    thumbnailPath = null,
    title,
    description = '',
    tags = [],
    privacyStatus = process.env.YOUTUBE_PRIVACY_STATUS || 'public',
    categoryId = '28'
  }) {
    if (!this.youtube) {
      await this.initialize();
    }

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found at: ${videoPath}`);
    }

    const videoStats = fs.statSync(videoPath);
    const fileSizeMB = (videoStats.size / (1024 * 1024)).toFixed(2);
    this.logger.info(`Uploading video (${fileSizeMB} MB) to YouTube as [${privacyStatus.toUpperCase()}]...`);
    this.logger.info(`Title: "${title}"`);

    const safeTitle = title.length > 100 ? title.substring(0, 97) + '...' : title;

    // 1. Upload Video
    const res = await this.youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: safeTitle,
          description: description,
          tags: tags,
          categoryId: categoryId,
          defaultLanguage: 'en',
          defaultAudioLanguage: 'en'
        },
        status: {
          privacyStatus: privacyStatus,
          selfDeclaredMadeForKids: false
        }
      },
      media: {
        body: fs.createReadStream(videoPath)
      }
    });

    const videoId = res.data.id;
    const youtubeUrl = `https://youtu.be/${videoId}`;
    this.logger.success(`✅ Video Uploaded Successfully!`);
    this.logger.info(`Live URL: ${youtubeUrl}`);
    this.logger.info(`Video ID: ${videoId}`);

    // 2. Upload Thumbnail (if provided)
    if (thumbnailPath && fs.existsSync(thumbnailPath)) {
      try {
        this.logger.info(`Uploading custom thumbnail: ${thumbnailPath}...`);
        await this.youtube.thumbnails.set({
          videoId: videoId,
          media: {
            body: fs.createReadStream(thumbnailPath)
          }
        });
        this.logger.success(`✅ Custom thumbnail applied to video ${videoId}`);
      } catch (thumbErr) {
        this.logger.warn(`Thumbnail upload warning (will keep video active): ${thumbErr.message}`);
      }
    }

    return {
      videoId,
      youtubeUrl,
      title: safeTitle,
      privacyStatus,
      uploadedAt: new Date().toISOString()
    };
  }

  /**
   * Upload / replace custom thumbnail on existing YouTube video
   */
  async setThumbnail(videoId, thumbnailPath) {
    if (!this.youtube) {
      await this.initialize();
    }
    if (!fs.existsSync(thumbnailPath)) {
      throw new Error(`Thumbnail file not found at: ${thumbnailPath}`);
    }
    this.logger.info(`Uploading custom thumbnail to video ${videoId}...`);
    const res = await this.youtube.thumbnails.set({
      videoId: videoId,
      media: {
        body: fs.createReadStream(thumbnailPath)
      }
    });
    this.logger.success(`✅ Custom thumbnail applied to video ${videoId}`);
    return res.data;
  }

  /**
   * Update privacy status of an existing YouTube video
   */
  async updateVideoPrivacy(videoId, privacyStatus = 'public') {
    if (!this.youtube) {
      await this.initialize();
    }
    this.logger.info(`Updating video ${videoId} privacy status to [${privacyStatus.toUpperCase()}]...`);
    const res = await this.youtube.videos.update({
      part: 'status',
      requestBody: {
        id: videoId,
        status: {
          privacyStatus: privacyStatus
        }
      }
    });
    this.logger.success(`✅ Video ${videoId} privacy status updated to [${privacyStatus.toUpperCase()}]!`);
    return res.data;
  }
}

module.exports = { YouTubeUploader };
