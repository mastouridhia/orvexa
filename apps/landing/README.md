# Landing page

Static marketing landing for the apex domain (e.g. `tableflow.tn`). Two files, no build step:

- `index.html`
- `styles.css`

## Local preview

```bash
cd apps/landing
python3 -m http.server 8080
# Open http://localhost:8080
```

Or any other static-file server.

## Production deploy

The simplest path is to add a static-file server block to the existing nginx proxy that serves the apex domain from this directory. Example addition to `deploy/nginx/conf.d-https/02-orvexa.conf`:

```nginx
server {
  listen 443 ssl http2;
  server_name tableflow.tn www.tableflow.tn;

  ssl_certificate     /etc/letsencrypt/live/tableflow.tn/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/tableflow.tn/privkey.pem;
  include /etc/nginx/conf.d/_ssl-common.inc;

  root /var/www/landing;
  index index.html;
  location / {
    try_files $uri $uri/ =404;
  }
}
```

And bind-mount `apps/landing` into the proxy container at `/var/www/landing`.

Alternatively, deploy as its own Dockerfile (similar pattern to `apps/Dockerfile.frontend` but skipping the build stage):

```dockerfile
FROM nginx:1.27-alpine
COPY apps/landing /usr/share/nginx/html
COPY apps/nginx-spa.conf /etc/nginx/conf.d/default.conf
```

## Editorial TODOs

- Replace `hello@tableflow.tn` with your real contact address.
- Set the `<meta name="description">` to something Tunisia-specific that reads well in search snippets.
- Add an OG/Twitter card image (`<meta property="og:image">`) for social shares.
- Localize: this version is English-only. The product itself is trilingual; the landing should follow once copy is finalized.
