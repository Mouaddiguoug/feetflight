# Build stage
FROM oven/bun:1 AS build

WORKDIR /app

# Cache packages installation
COPY package.json bun.lock ./

RUN bun install

# Copy source files
COPY ./src ./src
COPY tsconfig.json ./

ENV NODE_ENV=production

# Build the binary
RUN bun build \
    --compile \
    --minify-whitespace \
    --minify-syntax \
    --target bun \
    --outfile server \
    src/index.ts

# Production stage using distroless for minimal image
FROM gcr.io/distroless/base

WORKDIR /app

# Copy the binary from build stage
COPY --from=build /app/server server

ENV NODE_ENV=production

CMD ["./server"]

EXPOSE 3000
