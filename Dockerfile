# Fantacalcio Highlights — immagine per server Linux (Remotion + Chrome headless)
FROM node:22-bookworm-slim

# librerie che servono a Chrome headless per renderizzare i video
RUN apt-get update && apt-get install -y --no-install-recommends \
    git ca-certificates libnss3 libdbus-1-3 libatk1.0-0 libasound2 libxrandr2 libxkbcommon0 \
    libxfixes3 libxcomposite1 libxdamage1 libgbm1 libatk-bridge2.0-0 libcups2 libpango-1.0-0 \
    libcairo2 libxshmfence1 fonts-noto-color-emoji fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
# scarica ora il Chrome di Remotion, così il primo video non aspetta
RUN npx remotion browser ensure

ENV FH_SERVER=1 PORT=4321 NODE_ENV=production
EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://localhost:4321/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "app/server.mjs"]
