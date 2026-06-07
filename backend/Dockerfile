FROM node:20-slim

# Install dependencies for Playwright
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libnss3 \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgbm-dev \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --production=false

# Install Playwright browsers
RUN npx playwright install chromium --with-deps

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# Create directories
RUN mkdir -p screenshots logs

EXPOSE 4000

CMD ["node", "dist/index.js"]
