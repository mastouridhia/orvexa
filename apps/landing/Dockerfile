# syntax=docker/dockerfile:1.7
# Pure static landing page — no build step, just copy files into nginx.
# Build context: monorepo root.

ARG NGINX_VERSION=1.27-alpine

FROM nginx:${NGINX_VERSION}

COPY apps/nginx-spa.conf        /etc/nginx/conf.d/default.conf
COPY apps/landing/index.html    /usr/share/nginx/html/index.html
COPY apps/landing/plans.html    /usr/share/nginx/html/plans.html
COPY apps/landing/terms.html    /usr/share/nginx/html/terms.html
COPY apps/landing/privacy.html  /usr/share/nginx/html/privacy.html
COPY apps/landing/colors_and_type.css /usr/share/nginx/html/colors_and_type.css
COPY apps/landing/assets        /usr/share/nginx/html/assets

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1
