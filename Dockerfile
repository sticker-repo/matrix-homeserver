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

# automatic extract
ADD --unpack=true --keep-git-dir=false https://github.com/sticker-repo/sticker-repo.github.io.git#gh-pages /app/public

EXPOSE 80
CMD ["/run.sh"]
