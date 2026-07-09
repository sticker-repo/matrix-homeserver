import http from "http";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STICKER_REPO_DIR = path.join(__dirname, "sticker-repo");
const PORT = 80;

function json(obj, status = 200) {
  const body = JSON.stringify(obj);
  return {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
    body,
  };
}

async function getFileBytes(mediaId) {
  const mediaIdParts = mediaId.split("-");
  if (mediaIdParts.length !== 4) {
    return { bytes: Buffer.alloc(0), contentType: undefined, size: 0 };
  }

  const [repoName, packId, fileId, ext] = mediaIdParts;
  const safeRepo = repoName.replace(/[^a-zA-Z0-9_-]/g, '');
  const safePack = packId.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeFile = fileId.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeExt = ext.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeRepo || !safePack || !safeFile || !safeExt) {
    throw new Error("Invalid or unsafe file parameters.");
  }

  const absoluteBaseDir = path.resolve(STICKER_REPO_DIR);
  const filePath = path.join(
    absoluteBaseDir,
    safeRepo,
    "files",
    safePack,
    `${safeFile}.${safeExt}`
  );
  if (!filePath.startsWith(absoluteBaseDir)) {
    throw new Error("Access denied: Path traversal detected.");
  }

  try {
    const bytes = await fs.readFile(filePath);
    let contentType;
    switch (ext.toLowerCase()) {
      case "png":
        contentType = "image/png";
        break;
      case "jpg":
      case "jpeg":
        contentType = "image/jpeg";
        break;
      case "webp":
        contentType = "image/webp";
        break;
      case "webm":
        contentType = "video/webm";
        break;
      case "gif":
        contentType = "image/gif";
        break;
      case "tgs":
        contentType = "video/tgs";
        break;
      default:
        contentType = "application/octet-stream";
        break;
    }
    return { bytes, contentType, size: bytes.length };
  } catch (error) {
    throw new Error(`failed to read file: ${error.message}`);
  }
}

function rawMediaResponse(file) {
  return {
    status: 200,
    headers: {
      "content-type": file.contentType,
      "content-length": String(file.size),
      "cache-control": "public, max-age=31536000, immutable",
      "access-control-allow-origin": "*",
      "cross-origin-resource-policy": "cross-origin",
    },
    body: file.bytes,
  };
}

function federationMultipartResponse(file) {
  const boundary = "matrixboundary";
  const metadata = JSON.stringify({
    file: {
      mimetype: file.contentType,
      size: file.size,
    },
  });
  const head =
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${file.contentType}\r\n` +
    `Content-Length: ${file.size}\r\n\r\n`;
  const tail = `\r\n--${boundary}--\r\n`;
  const body = Buffer.concat([
    Buffer.from(head),
    file.bytes,
    Buffer.from(tail),
  ]);

  return {
    status: 200,
    headers: {
      "content-type": `multipart/mixed; boundary=${boundary}`,
      "cache-control": "public, max-age=31536000, immutable",
    },
    body,
  };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const hostname = req.headers.host;
    let response;

    if (pathname === "/.well-known/matrix/server") {
      response = json({ "m.server": `${hostname}:443` });
    } else if (pathname === "/.well-known/matrix/client") {
      response = json({
        "m.homeserver": { base_url: `https://${hostname}` },
      });
    } else {
      const fedMatch = pathname.match(
        /^\/_matrix\/federation\/v1\/media\/download\/([^/]+)$/
      );
      if (fedMatch) {
        const mediaId = fedMatch[1];
        const file = await getFileBytes(mediaId);
        response = federationMultipartResponse(file);
      } else {
        const downloadMatch = pathname.match(
          new RegExp(
            `^/(?:_matrix/client/v1/media/download|_matrix/media/v3/download|_matrix/media/r0/download)/${hostname.split(":")[0]}/([^/]+)(?:/[^/]+)?$`
          )
        );
        if (downloadMatch) {
          const mediaId = downloadMatch[1];
          const file = await getFileBytes(mediaId);
          response = rawMediaResponse(file);
        } else {
          const thumbMatch = pathname.match(
            new RegExp(
              `^/(?:_matrix/client/v1/media/thumbnail|_matrix/media/v3/thumbnail|_matrix/media/r0/thumbnail)/${hostname.split(":")[0]}/([^/]+)(?:/[^/]+)?$`
            )
          );
          if (thumbMatch) {
            const mediaId = thumbMatch[1];
            const file = await getFileBytes(mediaId);
            response = rawMediaResponse(file);
          } else {
            response = {
              status: 404,
              headers: { "content-type": "text/plain" },
              body: "Not found",
            };
          }
        }
      }
    }

    res.writeHead(response.status, response.headers);
    if (typeof response.body === "string") {
      res.end(response.body);
    } else {
      res.end(response.body);
    }
  } catch (error) {
    console.error("Error:", error);
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
