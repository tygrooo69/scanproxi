# --- Stage 1: Build (Frontend) ---
FROM node:20-alpine AS builder

WORKDIR /app

# Installation des dépendances
COPY package*.json ./
RUN npm install

# Copie des sources
COPY . .

# Injection de la clé API au moment du build (Requis par Vite)
ARG API_KEY
ENV API_KEY=${API_KEY}
ENV POCKETBASE_URL=${POCKETBASE_URL}
ENV POCKETBASE_ADMIN_EMAIL=${POCKETBASE_ADMIN_EMAIL}
ENV POCKETBASE_ADMIN_PASSWORD=${POCKETBASE_ADMIN_PASSWORD}

# Construction du frontend (génère le dossier /dist)
RUN npm run build

# --- Stage 2: Production (Backend + Serveur statique) ---
FROM node:20-alpine

WORKDIR /app

# Installation des dépendances de production uniquement
COPY package*.json ./
RUN npm install --omit=dev

# Copie du serveur et du build frontend depuis l'étape précédente
COPY server.js ./
COPY --from=builder /app/dist ./dist

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000

# Exposition du port
EXPOSE 3000

# Démarrage du serveur Node

CMD ["node", "server.js"]
