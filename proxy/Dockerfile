FROM nginx:alpine
ARG NGINX_CONF=nginx.conf
RUN sed -i 's@https://dl-cdn.alpinelinux.org/alpine@http://dl-cdn.alpinelinux.org/alpine@g' /etc/apk/repositories \
    && apk update \
    && apk add --no-cache ca-certificates openssl \
    && update-ca-certificates
RUN rm /etc/nginx/conf.d/default.conf
COPY ${NGINX_CONF} /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 80 443
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
