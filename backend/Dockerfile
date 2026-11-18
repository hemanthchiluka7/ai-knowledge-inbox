FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY backend/package*.json ./backend/
RUN npm ci -w backend
COPY backend/ ./backend/
RUN npm run build -w backend

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm ci -w backend --omit=dev
COPY --from=builder /app/backend/dist ./backend/dist
RUN mkdir -p /data
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "backend/dist/src/server.js"]
