# 프론트엔드(React + Vite) 이미지 — product/docker-compose.yml 의 frontend 서비스가 사용
# 1단계: npm run build 로 dist/ 생성 → 2단계: nginx가 dist/ 제공 + /api 요청을 backend 컨테이너로 전달
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
