FROM node:20-slim

# ffmpeg for stream capture + ca-certificates for HTTPS streams
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY worker.js ./

ENV NODE_ENV=production
CMD ["node", "worker.js"]
