# Techleela CRM web app: static build served by nginx.
#   docker build -t techleela-web --build-arg VITE_API_BASE_URL=https://api.example.com ./frontend
ARG NODE_IMAGE=node:22-bookworm-slim
ARG NGINX_IMAGE=nginx:1.27-alpine

FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Vite bakes these into the bundle at build time (they are public URLs, not secrets)
ARG VITE_API_BASE_URL
ARG VITE_SOCKET_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} VITE_SOCKET_URL=${VITE_SOCKET_URL}
RUN test -n "$VITE_API_BASE_URL" || (echo "Set --build-arg VITE_API_BASE_URL=https://your-api" && exit 1)
RUN npm run build

FROM ${NGINX_IMAGE} AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1/healthz || exit 1
