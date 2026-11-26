# maisongr-typo in a container: docker run --rm -v "$PWD:/work" ghcr.io/maison-gr/maisongr-typo check .
# Built from this repository's source. The package has no runtime dependencies, so the image holds Node.js and dist/.

# The build runs on the builder's own platform (TypeScript's output is the same everywhere); the image itself has no
# build step, so one build serves linux/amd64 and linux/arm64.
FROM --platform=$BUILDPLATFORM node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS build
WORKDIR /src
COPY package.json package-lock.json tsconfig.json tsconfig.build.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY src ./src
RUN npm run build

FROM node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5
LABEL org.opencontainers.image.title="maisongr-typo" \
      org.opencontainers.image.description="French typography, the Québec way (OQLF), or France's." \
      org.opencontainers.image.source="https://github.com/maison-gr/maisongr-typo" \
      org.opencontainers.image.vendor="Maison GR Inc." \
      org.opencontainers.image.licenses="MIT"
WORKDIR /app
COPY --from=build /src/dist ./dist
COPY package.json LICENSE ./
USER node
WORKDIR /work
# No arguments: the help, or standard input typeset to standard output (echo 'Prêt ?' | docker run -i …).
ENTRYPOINT ["node", "/app/dist/cli.js"]
