
# Étape 1 : Build de l'application
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG API_KEY
ENV VITE_API_KEY=$API_KEY
ENV API_KEY=$API_KEY
RUN npm run build

# Étape 2 : Serveur de production
FROM nginx:stable-alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/storage.json /usr/share/nginx/html/
COPY --from=build /app/config.json /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
