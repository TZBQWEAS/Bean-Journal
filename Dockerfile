FROM node:24-alpine@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85
LABEL org.opencontainers.image.title="Bean Journal" \
      org.opencontainers.image.version="1.3" \
      org.opencontainers.image.source="https://github.com/TZBQWEAS/Bean-Journal"
WORKDIR /app
COPY dist/ ./dist/
COPY server/ ./server/
RUN mkdir -p /data && chown node:node /data
ENV NODE_ENV=production DATA_DIR=/data PORT=8080
USER node
EXPOSE 8080
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.cjs"]
