# LazyKitty Builder
# Docker image for running Expo builds

FROM node:20-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Install expo-cli globally
RUN npm install -g expo-cli @expo/ngrok

# Create app directory
WORKDIR /app

# Copy builder package
COPY packages/builder/package.json packages/builder/
COPY packages/builder/dist packages/builder/dist/
COPY packages/shared/package.json packages/shared/
COPY packages/shared/dist packages/shared/dist/

# Install builder dependencies
WORKDIR /app/packages/builder
RUN npm install --production

# Set working directory back to app
WORKDIR /app

# Run the builder
CMD ["node", "packages/builder/dist/index.js"]
