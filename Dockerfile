# CONTENU DU DOCKERFILE POUR BUILDSCAN AI
# Ce fichier doit être nommé "Dockerfile" (sans extension)

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG API_KEY
ENV VITE_API_KEY=$API_KEY
ENV API_KEY=$API_KEY
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js ./server.js
COPY --from=build /app/storage.json ./storage.json
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]