#!/bin/sh
set -e

if [ ! -d "/app/sticker-repo/s1/.git" ]; then
    git clone https://github.com/sticker-repo/s1.git /app/sticker-repo/s1
fi

# Start cron daemon in the background
crond -f -l 2 &

# Start Node.js server
exec node server.js
