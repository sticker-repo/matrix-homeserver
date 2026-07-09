FROM node:26-alpine

WORKDIR /app
RUN apk add --no-cache git dcron

COPY package.json package-lock.json* ./
RUN npm install --production
COPY server.js ./
COPY run.sh /run.sh
RUN chmod +x /run.sh
ENV NODE_ENV=production

RUN mkdir -p /etc/crontabs
COPY crontab /etc/crontabs/root
RUN chmod 0644 /etc/crontabs/root

EXPOSE 80
CMD ["/run.sh"]
