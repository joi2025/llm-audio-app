# Etapa de desarrollo
FROM node:18-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de los archivos
COPY . .

# Exponer puerto
EXPOSE 3002

# Comando para desarrollo
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3002"]

# # Etapa de producción (comentada por ahora)
# FROM node:18-alpine AS builder
# WORKDIR /app
# COPY package*.json ./
# RUN npm install
# COPY . .
# RUN npm run build

# FROM nginx:stable-alpine
# COPY --from=builder /app/dist /usr/share/nginx/html
# COPY nginx.conf /etc/nginx/conf.d/default.conf
# EXPOSE 80
# CMD ["nginx", "-g", "daemon off;"]
