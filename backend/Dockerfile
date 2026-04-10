FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app
RUN npm i -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
# 强制重新编译原生模块，确保是 musl 兼容的
RUN pnpm rebuild better-sqlite3
# 验证 .node 文件存在
RUN find /app/node_modules -name "better_sqlite3.node" -type f | head -5

COPY . .
RUN pnpm build

# 裁剪 devDependencies
RUN pnpm prune --prod
# 再次验证 prune 后 .node 文件还在
RUN find /app/node_modules -name "better_sqlite3.node" -type f | head -5

# 删除编译工具，保留运行时依赖
RUN apk del python3 make g++ && apk add --no-cache libstdc++

RUN mkdir -p uploads data
EXPOSE 3000
CMD ["node", "dist/main"]
