FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
RUN npm i -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
RUN pnpm prune --prod

FROM node:20-alpine
RUN apk add --no-cache libstdc++
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
RUN mkdir -p uploads data
EXPOSE 3000
CMD ["node", "dist/main"]
