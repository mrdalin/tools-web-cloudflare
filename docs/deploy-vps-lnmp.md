# Tools-Web VPS/LNMP static deployment

This project can be deployed to an LNMP/Nginx VPS as a static SPA. Cloudflare Functions and D1 are not migrated by this package; data features such as login, notes, short links, QA, email verification, and AI app persistence still need an external Functions API.

## Build environment

Create `.env.production` before the final production build:

```env
NODE_ENV=production
VITE_SITE_URL=https://your-vps-domain.example
VITE_FUNCTIONS_BASE_URL=https://your-functions-api.example
```

If there is no external Functions/API deployment, leave `VITE_FUNCTIONS_BASE_URL` empty. Pure frontend tools will still work, while data-backed features will be unavailable.

Install and build:

```bash
pnpm install --frozen-lockfile
pnpm build:pro
```

The static site output is `dist/`.

## Nginx server block

Use this as the LNMP site config template. Replace `example.com` and `/www/wwwroot/tools-web` with your domain and extracted `dist` directory.

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name example.com www.example.com;

    root /www/wwwroot/tools-web;
    index index.html;

    # SSL certificate paths are usually managed by your LNMP panel.
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(?:js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|br|gz)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        try_files $uri =404;
    }
}
```

## Upload

1. Upload the generated `temp/tools-web-dist-*.zip` to the VPS.
2. Extract it into the configured `root` directory.
3. Reload Nginx after checking the config:

```bash
nginx -t
systemctl reload nginx
```

Verify the homepage, a tool page, a refreshed deep route, and static assets. If `VITE_FUNCTIONS_BASE_URL` is configured, also verify login and data-backed tools.

