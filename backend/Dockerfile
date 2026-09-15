# This container hosts only the gateway. It is NOT the C/C++ sandbox.
FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787
WORKDIR /app
COPY --chown=node:node server.mjs package.json ./
USER node
EXPOSE 8787
CMD ["node", "server.mjs"]
