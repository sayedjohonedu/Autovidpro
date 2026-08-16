FROM node:20-bookworm-slim

# Install system utilities, FFmpeg, Python3, and audio tools
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    git \
    sox \
    libsox-fmt-all \
    espeak \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install NPM dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application files
COPY . .

# Ensure clean directories exist inside container
RUN rm -rf data/videos data/cache logs temp && mkdir -p data/videos data/cache logs temp

# Expose web dashboard port
EXPOSE 3456

ENV PORT=3456
ENV NODE_ENV=production

CMD ["npm", "start"]
