FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app
RUN npm i -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
RUN pnpm prune --prod
RUN apk del python3 make g++ && apk add --no-cache libstdc++
RUN mkdir -p uploads data
EXPOSE 3000
CMD ["node", "dist/main"]
