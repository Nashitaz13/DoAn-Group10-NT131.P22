FROM node:20-alpine
WORKDIR /app

# Copy manifest (match cả package.json và package-lock.json nếu có)
COPY server/package*.json /app/

# Cài deps (dùng ci khi có lock, fallback i nếu không có)
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm i --omit=dev; fi

# Copy toàn bộ mã backend
COPY server/ /app/

# Copy FE tĩnh từ context gốc (compose đã set context là .)
ARG PUBLIC_DIR=public
COPY ${PUBLIC_DIR}/ /app/public/

ENV PORT=4000
EXPOSE 4000
CMD ["node","server.js"]
