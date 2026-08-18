FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy only package files for backend and install production deps
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend source code
COPY backend/ .

# Expose a default port (Render will set $PORT at runtime)
EXPOSE 8080
ENV PORT=8080

# Start the server
CMD ["node", "server.js"]
