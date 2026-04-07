# --- STAGE 1: BASE ---
FROM node:24-alpine AS base
WORKDIR /app
COPY package*.json ./
# Production dependencies by default
RUN npm install --omit=dev

# --- STAGE 2: DEVELOPMENT ---
# Local machine-e Nodemon run korar jonno
FROM base AS development
# Dev-er jonno shob dependencies (including nodemon) install hobe
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# --- STAGE 3: PRODUCTION ---
# Final clean image server-er jonno (Running directly from src/)
FROM node:24-alpine AS production
WORKDIR /app
# Only production dependencies copy kora
COPY --from=base /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
EXPOSE 3000
# Webpack bade sora-sori src/index.js run korbe
CMD ["node", "src/index.js"]
