# Deploy to DigitalOcean (fbleadinstant.com)

Domain: `fbleadinstant.com`  
Webhook URL: `https://fbleadinstant.com/webhook/facebook`  
Health: `https://fbleadinstant.com/health`

## 1. Push code to GitHub (Windows PC)

Run in PowerShell from the project folder:

```powershell
cd "c:\Users\19mig\OneDrive\Desktop\FbInstant"
git init
git add .
git commit -m "Initial Facebook Lead Ads webhook server"
git branch -M main
git remote add origin https://github.com/PragonMedia/PGNM-FB-INSTANT.git
git push -u origin main
```

If the repo already has commits, use:

```powershell
git remote add origin https://github.com/PragonMedia/PGNM-FB-INSTANT.git
git pull origin main --allow-unrelated-histories
git push -u origin main
```

**Never commit `.env`** — it is in `.gitignore`.

---

## 2. Server setup (copy-paste on droplet)

SSH in:

```bash
ssh root@45.55.128.131
```

### 2.1 Install packages

```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx certbot python3-certbot-nginx git
npm install -g pm2
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

### 2.2 Clone app

```bash
mkdir -p /var/www/fbinstant
cd /var/www/fbinstant
git clone https://github.com/PragonMedia/PGNM-FB-INSTANT.git .
npm install --production
```

### 2.3 Create `.env` on server

```bash
nano /var/www/fbinstant/.env
```

Paste your real values (from local `.env`), then save (`Ctrl+O`, Enter, `Ctrl+X`):

```env
PORT=3000
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_VERIFY_TOKEN=pgnm-fbinstant-verify-2026
FACEBOOK_PAGE_ACCESS_TOKEN=
FACEBOOK_GRAPH_VERSION=v25.0
FACEBOOK_SKIP_SIGNATURE=false
PARTNER_API_URL=
PARTNER_API_KEY=
```

```bash
chmod 600 /var/www/fbinstant/.env
```

### 2.4 Start with PM2

```bash
cd /var/www/fbinstant
pm2 start server.js --name fbinstant
pm2 save
pm2 startup
```

Run the command `pm2 startup` prints, then:

```bash
pm2 save
pm2 status
curl -s http://127.0.0.1:3000/health
```

### 2.5 Nginx

```bash
cp /var/www/fbinstant/deploy/nginx-fbleadinstant.conf /etc/nginx/sites-available/fbinstant
ln -sf /etc/nginx/sites-available/fbinstant /etc/nginx/sites-enabled/fbinstant
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### 2.6 SSL (DNS must point to this server first)

```bash
certbot --nginx -d fbleadinstant.com --non-interactive --agree-tos -m tech@paragonmedia.io --redirect
```

Or interactive:

```bash
certbot --nginx -d fbleadinstant.com
```

---

## 3. Meta webhook

1. developers.facebook.com → PGNM_TECH → Use cases → Webhooks  
2. Product: **Page**  
3. Callback URL: `https://fbleadinstant.com/webhook/facebook`  
4. Verify token: same as `FACEBOOK_VERIFY_TOKEN` in server `.env`  
5. **Verify and save**  
6. Subscribe to **leadgen**

---

## 4. Test

```bash
curl -s https://fbleadinstant.com/health
pm2 logs fbinstant --lines 50
```

Submit a test lead (form Preview → Create lead) and watch logs.

---

## 5. Updates (redeploy)

```bash
cd /var/www/fbinstant
git pull
npm install --production
pm2 restart fbinstant
```
