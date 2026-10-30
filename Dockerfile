FROM nginx:1.30.6-alpine@sha256:0e52bd054126cdc040b1276c0af347aeb02a41b9cfe305d6094767ac30e97949
LABEL org.opencontainers.image.title="Bean Journal" \
      org.opencontainers.image.version="1.1" \
      org.opencontainers.image.source="https://github.com/TZBQWEAS/Bean-Journal"
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY dist/ /usr/share/nginx/html/
USER 101:101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
