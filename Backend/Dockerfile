# # Build stage
# FROM node:24-alpine AS builder
# WORKDIR /app
# COPY package*.json ./
# RUN npm install
# COPY . .
# EXPOSE 3000
# CMD ["npm", "run", "dev"]

# # Runtime stage
# FROM node:24-alpine
# WORKDIR /app
# COPY package*.json ./
# RUN npm ci --only=production
# # Webpack build folder copy kora
# COPY --from=builder /app/dist ./dist
# # Source folder copy kora (optional, jodi index.js src-e thake)
# COPY --from=builder /app/src ./src
# ENV NODE_ENV=production
# EXPOSE 3000
# CMD ["node", "dist/index.js"]



# 1. Use the official Node.js 24 Alpine image for a small footprint
FROM node:24-alpine

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy package.json and package-lock.json first (optimizes layer caching)
COPY package*.json ./

# 4. Install all dependencies
RUN npm install

# 5. Copy the rest of the application code
COPY . .

# 6. Expose the port the app runs on
EXPOSE 3000

# 7. Start the application in development mode
CMD ["npm", "run", "dev"]