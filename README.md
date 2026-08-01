# Onefend

Open-source AI security and governance platform. Monitor, detect, and control how AI tools are used across your organization.

Onefend provides visibility into Shadow AI usage -- unauthorized or unmonitored AI tools employees use at work -- and helps enforce data loss prevention policies in real time.

## Features

- **AI Usage Monitoring** -- Track which AI tools (ChatGPT, Gemini, Claude, Copilot, DeepSeek, Perplexity, Grok, etc.) are being used across your organization
- **Data Loss Prevention (DLP)** -- Detect and block sensitive data (PII, credentials, source code, financial data) before it reaches AI services
- **Detection Patterns** -- Configurable regex and AI-powered pattern matching for sensitive content
- **Policy Engine** -- Define and enforce policies (Allow, Warn, Block, Redact) per group, department, or user
- **Browser Extension** -- Chrome and Firefox extension (Manifest V3) that monitors AI web apps in real time
- **Desktop Agent** -- Tauri-based native app that monitors desktop AI tools (ChatGPT Desktop, Claude Desktop, Claude Code CLI, Cursor, Windsurf)
- **Real-time Alerts** -- Notifications on policy violations
- **Analytics Dashboard** -- AI usage trends, risk scores, and compliance posture
- **Role-based Access Control** -- Admin, Analyst, Viewer, and User roles
- **MFA Support** -- TOTP-based two-factor authentication with backup codes
- **Email Invitations** -- Invite users via email with enrollment tokens for extension setup
- **SIEM/Webhook Integrations** -- Export events to external systems

## Architecture

```
packages/
  backend/       # NestJS API (TypeScript, Prisma, PostgreSQL, Redis)
  frontend/      # Next.js dashboard (React, TailwindCSS)
  extension/     # Browser extension (Chrome/Firefox, Manifest V3)
  desktop-agent/ # Desktop agent (Tauri - Rust + TypeScript)
```

Each deployment is a single-tenant instance -- one organization per installation. All features are enabled by default.

### How it works

```
Browser Extension / Desktop Agent
        |
        |  Intercepts AI conversations
        |  Applies regex + AI pattern matching
        |  Enforces policies (block/warn/redact/allow)
        |
        v
   NestJS Backend (/api/v1)
        |
        |--- PostgreSQL (data, policies, events)
        |--- Redis (caching, rate limiting, token blacklist)
        |--- GCP AI Services (Gemini, DLP, Document AI) [optional]
        |
        v
   Next.js Dashboard
        |
        |  Admin manages policies, views events,
        |  invites users, monitors compliance
```

Onefend works on both **public cloud** and **private network** deployments. The extension and desktop agent only need network access to the Onefend backend -- no internet required if you skip cloud AI services.

---

## Quick Start (Development)

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Docker and Docker Compose

### 1. Clone and install

```bash
git clone https://github.com/emir38/Onefend-Anti-ShadowAI.git
cd Onefend-Anti-ShadowAI
pnpm install
```

### 2. Start databases

```bash
docker compose up -d postgres redis
```

This starts PostgreSQL (port 5432) and Redis (port 6379).

### 3. Configure and start the backend

```bash
cp packages/backend/.env.example packages/backend/.env
# Edit packages/backend/.env -- at minimum set DATABASE_URL and JWT_SECRET
```

```bash
cd packages/backend
npx prisma migrate dev    # Create database tables
node seed-simple.js       # Create default admin (admin@onefend.local / Admin123!)
pnpm dev                  # Start backend on port 3000
```

The API will be available at `http://localhost:3000/api/v1`.
Swagger docs at `http://localhost:3000/api/docs`.

### 4. Start the frontend

```bash
cp packages/frontend/.env.local.example packages/frontend/.env.local
cd packages/frontend
pnpm dev
```

The dashboard will be available at `http://localhost:3001`.
Login with `admin@onefend.local` / `Admin123!`.

On first login, you will be prompted to set up MFA (two-factor authentication). Scan the QR code with an authenticator app (Google Authenticator, Authy, etc.) and enter the 6-digit code to complete setup.

### 5. Build and load the browser extension

```bash
cd packages/extension
cp .env.example .env
# .env should have: VITE_API_BASE_URL=http://localhost:3000/api/v1
pnpm build
```

Then load `packages/extension/dist` as an unpacked extension in Chrome:
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `packages/extension/dist` folder

### 6. Enroll the extension

1. In the dashboard, go to **Deployment** and create an enrollment token
2. Open the extension popup -- it will show the onboarding page
3. Enter the enrollment token and your email
4. The extension is now connected and enforcing policies

### 7. First steps after setup

Once the backend, frontend, and at least one extension are running:

1. **Create policies** -- Go to **Policies** in the dashboard. Create rules per application (e.g., Block ChatGPT for the Finance group, Warn on Claude for everyone).
2. **Create user groups** -- Go to **Groups** to organize users by department. Assign policies to groups.
3. **Add users** -- Go to **Deployment** to invite users via email (if SMTP is configured) or create enrollment tokens to share manually. Users are automatically created when they enroll their extension.
4. **Configure detection patterns** -- Go to **Patterns** to add custom regex rules for sensitive data specific to your organization (project names, internal IDs, etc.).
5. **Monitor activity** -- The **Dashboard** shows real-time AI usage. **Events** shows individual conversations flagged by DLP. **Analytics** shows trends and risk scores.
6. **Set up integrations** (optional) -- Go to **Settings > Integrations** to export events to your SIEM via webhook or syslog.

---

## Production Deployment

### Prerequisites

- A Linux server (cloud VM, on-prem, or internal VM)
- Docker and Docker Compose installed
- The server IP or hostname reachable by your users' browsers

### Step 1: Clone the repository

```bash
git clone https://github.com/emir38/Onefend-Anti-ShadowAI.git
cd Onefend-Anti-ShadowAI
```

### Step 2: Configure environment

```bash
cp .env.example .env
nano .env
```

**You must set these variables:**

| Variable | What to put | Example |
|----------|-------------|---------|
| `SERVER_URL` | The URL where users will access Onefend. Use your server's IP or hostname. | `http://10.0.1.50` or `https://onefend.yourcompany.com` |
| `POSTGRES_PASSWORD` | A strong database password (letters, numbers, underscores only -- no @$!&) | `MySecureDB_2026` |
| `JWT_SECRET` | A random 64-character hex string. Generate with `openssl rand -hex 32` | `a1b2c3d4...` (64 chars) |
| `ADMIN_EMAIL` | Email for the admin account | `admin@yourcompany.com` |
| `ADMIN_PASSWORD` | Password for the admin account (min 12 chars, mixed case + number) | `SecureAdmin123!` |

**Optional variables:**

| Variable | When to set it |
|----------|---------------|
| `PORT` | If you want a port other than 80 (e.g., `8080`) |
| `COOKIE_SECURE` | Set to `true` if you use HTTPS |
| `SMTP_HOST/USER/PASS/MAIL_FROM` | To send invitation emails instead of sharing tokens manually |
| `GCP_PROJECT_ID` + GCP credentials | To enable AI-powered detection (see [AI and DLP Provider Setup](#ai-and-dlp-provider-setup)) |

**Example `.env` for an internal server at 10.0.1.50:**

```bash
SERVER_URL=http://10.0.1.50
POSTGRES_PASSWORD=MySecureDB_2026
JWT_SECRET=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
ADMIN_EMAIL=admin@mycompany.local
ADMIN_PASSWORD=SecureAdmin123!
```

**Example `.env` for a public server with domain:**

```bash
SERVER_URL=https://onefend.yourcompany.com
POSTGRES_PASSWORD=MySecureDB_2026
JWT_SECRET=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=SecureAdmin123!
COOKIE_SECURE=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@yourcompany.com
SMTP_PASS=your-app-password
MAIL_FROM=noreply@yourcompany.com
```

### Step 3: Start Onefend

```bash
docker-compose up -d
```

> **Note:** If `docker-compose` is not found, try `docker compose` (without hyphen). Both are equivalent.

This starts all services (PostgreSQL, Redis, backend, frontend, nginx). On first boot, it automatically:
- Creates the database schema
- Seeds the admin account and 19 default detection patterns

Wait ~30 seconds for all services to initialize.

### Step 4: Verify

```bash
# Check all containers are running
docker-compose ps

# Test backend health (from the server itself)
curl http://localhost/api/v1/health
# Expected: {"status":"ok","timestamp":"..."}
```

Open a browser and go to your `SERVER_URL` (e.g., `http://10.0.1.50`). Login with your configured `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

On first login, you will be prompted to set up MFA. Scan the QR code with an authenticator app (Google Authenticator, Authy, etc.) and enter the 6-digit code.

**MFA Recovery:** If you lose access to your authenticator app, reset MFA via the database:
```bash
docker-compose exec postgres psql -U postgres -d onefend -c \
  "UPDATE users SET is_mfa_enabled=false, mfa_secret=NULL WHERE identifier='YOUR_ADMIN_EMAIL';"
```
Then login again and set up MFA with a new device.

### Step 5: Build and distribute the browser extension

The extension must be built on a machine with Node.js 20+ installed. This can be your local workstation, a CI server, or the same server running Docker (if Node.js is available):

```bash
cd packages/extension
npm install

# Set your server URL (same as SERVER_URL in .env):
echo 'VITE_API_BASE_URL=http://10.0.1.50/api/v1' > .env

# Build
npm run build
npm run package:chrome    # Creates onefend-chrome.zip in packages/extension/
```

**Important:** Replace `10.0.1.50` with your actual server IP or hostname. This URL is baked into the extension at build time. If you changed `PORT` in your `.env` (e.g., `PORT=8080`), include the port in the URL: `http://10.0.1.50:8080/api/v1`

**Distribute to users via:**
- Share the `onefend-chrome.zip` file directly -- users load it as unpacked extension in `chrome://extensions`
- Chrome Web Store (private/unlisted) -- for managed Chrome deployments
- Group Policy (GPO/MDM) -- for enterprise environments

### Step 6: Enroll users

1. In the dashboard, go to **Deployment**
2. **Option A (with SMTP):** Enter user emails and click "Send Invitations" -- users receive an email with setup instructions
3. **Option B (without SMTP):** Click "Create Manual Token", copy the token, and share it with users via Slack, email, or any other channel
4. Users install the extension, enter the enrollment token, and they're protected
5. The dashboard shows device status as Active once enrollment completes

### Step 7: Configure policies

> **Note:** By default, all AI applications are set to **Allow** (monitor only, no intervention). Users can use any AI tool freely until you create specific policies.

1. **Applications** -- AI platforms are auto-detected when users visit them. You'll see them appear here.
2. **Policies** -- Create rules per application:
   - **Allow** -- Monitor only, no intervention
   - **Warn** -- Show a warning banner, user can proceed
   - **Block** -- Block access completely
3. **Patterns** -- 19 built-in detection patterns (API keys, credit cards, SSNs, etc.). Add custom patterns for your organization.
4. **Groups** -- Organize users by department. Assign policies per group (e.g., Finance can't use ChatGPT, Marketing can).

> **Timing:** Extensions fetch updated policies every 15 minutes. For immediate enforcement, users can click the extension icon and press "Sync Now".

### Updating Onefend

**Backup before updating:**
```bash
docker-compose exec postgres pg_dump -U postgres onefend > backup_$(date +%Y%m%d).sql

# To restore from backup (if needed):
cat backup_YYYYMMDD.sql | docker-compose exec -T postgres psql -U postgres onefend
```

> **Note:** The `pg_dump` command works without a password because PostgreSQL inside Docker uses trust authentication for local connections.

```bash
cd Onefend-Anti-ShadowAI
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

The database data is preserved in Docker volumes across updates.

### HTTPS / TLS setup

The included nginx configuration serves HTTP only. To enable HTTPS:

**Option A: Add TLS to the included nginx**

1. Place your certificate files on the server (e.g., `/etc/ssl/onefend/`)
2. Create a custom nginx config:
   ```bash
   cp nginx.conf nginx-ssl.conf
   ```
3. Edit `nginx-ssl.conf`:
   ```nginx
   server {
       listen 80;
       server_name _;
       return 301 https://$host$request_uri;
   }

   server {
       listen 443 ssl;
       server_name _;

       ssl_certificate     /etc/ssl/onefend/cert.pem;
       ssl_certificate_key /etc/ssl/onefend/key.pem;

       client_max_body_size 50M;

       location /api/v1/ {
           proxy_pass http://backend:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_set_header X-Forwarded-Host $host;
       }

       location / {
           proxy_pass http://frontend:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
4. Update `docker-compose.yml` to mount the new config and expose port 443:
   ```yaml
   nginx:
     volumes:
       - ./nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro
       - /etc/ssl/onefend:/etc/ssl/onefend:ro
     ports:
       - "80:80"
       - "443:443"
   ```
5. Set in your `.env`:
   ```bash
   SERVER_URL=https://onefend.yourcompany.com
   COOKIE_SECURE=true
   ```
6. Restart: `docker-compose down && docker-compose up -d`

**Option B: Use an external reverse proxy**

If you already have a reverse proxy (Caddy, Traefik, HAProxy), point it to the Onefend nginx on port 80 and terminate TLS there. Set `COOKIE_SECURE=true` in your `.env`.

### Network requirements

The Onefend server must be reachable from the browsers and machines you want to monitor. The browser extension and desktop agent connect to the Onefend backend via HTTP/HTTPS.

**This means the Onefend server must share a network with the endpoints you want to protect:**

| Deployment | How endpoints reach Onefend |
|------------|---------------------------|
| On-premise server | Same corporate LAN -- no extra config needed |
| Cloud VM (same provider as corporate VPN) | Endpoints connect via VPN to the cloud VPC where Onefend runs |
| Cloud VM (no VPN) | Onefend exposed on a public IP with firewall rules restricting access to your corporate IP ranges |

**If your users are all in the same office/network:**
- Deploy on any server in that network (a VM, a NAS, a spare machine with Docker)
- No VPN or public IP needed

**If your users are remote (work from home, multiple offices):**
- **Option A: VPN** -- Deploy Onefend internally, users connect via corporate VPN
- **Option B: Public endpoint** -- Expose Onefend on a public domain with TLS (e.g., `https://onefend.yourcompany.com`). The API is protected by JWT authentication -- only enrolled devices with valid tokens can communicate with the backend. Recommended: restrict access with firewall rules to your corporate IP ranges as an additional layer

### Infrastructure recommendations

**Simple deployment (recommended for most teams):**

A single server running Docker Compose. Suitable for up to ~500 monitored users.

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Disk | 20 GB | 50 GB SSD |
| OS | Ubuntu 22.04+ / Debian 12+ | Any Linux with Docker support |

**Production deployment (for large organizations):**

Use managed database and cache services from your cloud provider for automatic backups, high availability, and less maintenance.

| Component | Recommended service |
|-----------|-------------------|
| Database | Cloud SQL (GCP), RDS (AWS), or Azure Database for PostgreSQL |
| Cache | Memorystore (GCP), ElastiCache (AWS), or Azure Cache for Redis |
| Compute | Cloud Run (GCP), ECS Fargate (AWS), or Container Apps (Azure) |
| Load Balancer | Cloud LB (GCP), ALB (AWS), or App Gateway (Azure) |
| TLS | Managed certificates (free on all three clouds) |

With managed services, configure the database and cache connection strings in your `.env` and run only the backend and frontend containers:

```bash
# Example: skip Docker postgres/redis, use managed services
DATABASE_URL=postgresql://user:pass@your-managed-db-host:5432/onefend
REDIS_HOST=your-managed-redis-host

docker-compose up -d backend frontend nginx migrate
```

### Cloud deployment guides

Onefend's infrastructure (backend, frontend, database, cache) can run on any cloud or on-premise. The AI services (Vertex AI, Cloud DLP, Document AI) always run on Google Cloud -- they are REST APIs accessible from anywhere with an internet connection. On GCP infrastructure (Cloud Run, GKE, Compute Engine), authentication is handled automatically via ADC. On other clouds or on-premise, a GCP service account key is required.

**AI latency by deployment location:**

| Backend location | AI/DLP latency | Notes |
|-----------------|----------------|-------|
| GCP | ~20-50ms | Same network, no egress costs |
| AWS | ~80-200ms | Cross-cloud, GCP egress fees apply |
| Azure | ~80-200ms | Cross-cloud, GCP egress fees apply |
| On-premise | ~100-300ms | Internet round-trip |

With Redis caching (7 days for AI, 24 hours for DLP), only the first analysis of each unique text pays this latency. Repeated inputs resolve from cache in <1ms.

---

### GCP (recommended)

Deploying on GCP keeps everything in the same network -- lowest latency, no egress costs, simplest AI service setup.

**Infrastructure options:**

| Component | Simple (Compute Engine) | Production (managed) |
|-----------|------------------------|---------------------|
| PostgreSQL | Docker container | Cloud SQL |
| Redis | Docker container | Memorystore |
| Backend/Frontend | Docker on VM | Cloud Run |
| AI/DLP | Vertex AI + Cloud DLP | Vertex AI + Cloud DLP |

**Public access (users connect from anywhere):**

```
Internet
   |
   v
[Cloud Load Balancer] -- Google-managed TLS certificate
   |
   +---> Cloud Run: onefend-backend (:3000)
   +---> Cloud Run: onefend-frontend (:8080)
   |
   +---> Cloud SQL (private IP)
   +---> Memorystore (private IP)
   +---> Vertex AI / Cloud DLP (Google internal network)
```

1. Deploy Cloud Run services with `--ingress=all` (accepts traffic from internet)
2. Create an external HTTPS Load Balancer with Google-managed certificate
3. Map your domain (e.g., `onefend.yourcompany.com`) to the load balancer IP
4. Extensions connect to `https://onefend.yourcompany.com/api/v1`

**Private access (users connect only from corporate network):**

```
Corporate VPN / Cloud Interconnect
   |
   v
[Internal Load Balancer] -- No public IP
   |
   +---> Cloud Run: onefend-backend (:3000)
   +---> Cloud Run: onefend-frontend (:8080)
   |
   +---> Cloud SQL (private IP)
   +---> Memorystore (private IP)
   +---> Vertex AI / Cloud DLP (Private Google Access)
```

1. Deploy Cloud Run services with `--ingress=internal` (blocks internet traffic)
2. Create an internal HTTPS Load Balancer in your VPC
3. Users access via Cloud VPN or Cloud Interconnect
4. Configure Private Google Access so Cloud Run can reach Vertex AI and Cloud DLP without internet
5. Extensions connect to `https://onefend.internal.yourcompany.com/api/v1` (resolves via private DNS)

**Setup commands (both public and private):**

```bash
# 1. Enable APIs
gcloud services enable sqladmin.googleapis.com redis.googleapis.com \
  run.googleapis.com artifactregistry.googleapis.com \
  aiplatform.googleapis.com dlp.googleapis.com documentai.googleapis.com

# 2. Create Cloud SQL
gcloud sql instances create onefend-db \
  --database-version=POSTGRES_14 --tier=db-f1-micro --region=us-central1 \
  --root-password=YOUR_DB_PASSWORD
gcloud sql databases create onefend --instance=onefend-db

# 3. Create Memorystore
gcloud redis instances create onefend-cache \
  --size=1 --region=us-central1 --redis-version=redis_6_x

# 4. Create service account with AI roles
gcloud iam service-accounts create onefend-backend
for role in roles/aiplatform.user roles/dlp.user roles/documentai.editor roles/storage.admin; do
  gcloud projects add-iam-policy-binding YOUR_PROJECT \
    --member="serviceAccount:onefend-backend@YOUR_PROJECT.iam.gserviceaccount.com" \
    --role="$role"
done

# 5. Create Artifact Registry repository (first time only)
gcloud artifacts repositories create onefend \
  --repository-format=docker --location=us-central1

# 6. Build and push images
gcloud builds submit packages/backend \
  --tag us-central1-docker.pkg.dev/YOUR_PROJECT/onefend/backend:latest
gcloud builds submit packages/frontend \
  --tag us-central1-docker.pkg.dev/YOUR_PROJECT/onefend/frontend:latest

# 7. Deploy to Cloud Run
#    For public:  --ingress=all
#    For private: --ingress=internal
#    Note: No GCP_CLIENT_EMAIL or GCP_PRIVATE_KEY needed -- Cloud Run uses
#    Application Default Credentials (ADC) via the attached service account.
gcloud run deploy onefend-backend \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT/onefend/backend:latest \
  --region us-central1 \
  --ingress=all \
  --service-account onefend-backend@YOUR_PROJECT.iam.gserviceaccount.com \
  --add-cloudsql-instances YOUR_PROJECT:us-central1:onefend-db \
  --vpc-egress=private-ranges-only \
  --set-env-vars "SERVER_URL=https://YOUR_DOMAIN,DATABASE_URL=postgresql://postgres:DB_PASS@/onefend?host=/cloudsql/YOUR_PROJECT:us-central1:onefend-db,\
REDIS_HOST=MEMORYSTORE_IP,JWT_SECRET=YOUR_SECRET,NODE_ENV=production,GCP_PROJECT_ID=YOUR_PROJECT,GCP_MODEL=gemini-2.5-flash,GCP_LOCATION=us-central1"

gcloud run deploy onefend-frontend \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT/onefend/frontend:latest \
  --region us-central1 \
  --ingress=all

# 8. Run migrations
gcloud run jobs create onefend-migrate \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT/onefend/backend:latest \
  --region us-central1 \
  --add-cloudsql-instances YOUR_PROJECT:us-central1:onefend-db \
  --set-env-vars "DATABASE_URL=...,ADMIN_EMAIL=admin@yourcompany.com,ADMIN_PASSWORD=YOUR_PASS" \
  --command "sh","-c","npx prisma migrate deploy && node seed-simple.js"
gcloud run jobs execute onefend-migrate --region us-central1 --wait
```

---

### AWS

Run infrastructure on AWS, AI services on GCP. The backend calls GCP AI APIs over the internet using a service account key stored in environment variables.

**Infrastructure options:**

| Component | Simple (EC2) | Production (managed) |
|-----------|-------------|---------------------|
| PostgreSQL | Docker container | Amazon RDS |
| Redis | Docker container | Amazon ElastiCache |
| Backend/Frontend | Docker on EC2 | ECS Fargate |
| AI/DLP | GCP (cross-cloud) | GCP (cross-cloud) |

**Public access (users connect from anywhere):**

```
Internet
   |
   v
[Application Load Balancer] -- ACM TLS certificate (free)
   |
   +---> ECS Fargate / EC2: onefend-backend (:3000)
   +---> ECS Fargate / EC2: onefend-frontend (:8080)
   |
   +---> RDS PostgreSQL (private subnet)
   +---> ElastiCache Redis (private subnet)
   +---> GCP AI APIs (outbound internet)
```

1. Create an ALB in a public subnet with AWS Certificate Manager TLS
2. Place ECS/EC2, RDS, and ElastiCache in private subnets
3. Backend needs a NAT Gateway for outbound internet to reach GCP AI APIs
4. Map your domain to the ALB (Route 53 or external DNS)
5. Extensions connect to `https://onefend.yourcompany.com/api/v1`

**Private access (users connect only from corporate network):**

```
AWS Direct Connect / VPN
   |
   v
[Internal ALB] -- No public IP, no internet exposure
   |
   +---> ECS Fargate / EC2: onefend-backend (:3000)
   +---> ECS Fargate / EC2: onefend-frontend (:8080)
   |
   +---> RDS PostgreSQL (private subnet)
   +---> ElastiCache Redis (private subnet)
   +---> GCP AI APIs (via NAT Gateway, outbound only)
```

1. Create an internal ALB (scheme: internal) in private subnets
2. Users access via AWS Site-to-Site VPN or Direct Connect
3. Backend still needs outbound internet (NAT Gateway) to call GCP AI APIs
4. No inbound internet traffic -- fully private except for GCP API calls
5. Extensions connect to `https://onefend.internal.yourcompany.com/api/v1` (resolves via private DNS)

**For fully offline (no AI):** Remove the NAT Gateway. Backend runs regex-only detection with no external calls.

**For EC2 deployment (Docker Compose on the VM):**

```bash
# Using managed services
DATABASE_URL=postgresql://user:pass@your-rds-endpoint.rds.amazonaws.com:5432/onefend
REDIS_HOST=your-elasticache.cache.amazonaws.com

# Skip postgres/redis containers, only run backend + frontend
docker compose up -d backend frontend migrate
```

**For ECS Fargate:** Create task definitions and services via the AWS Console or Terraform. The same environment variables apply.

---

### Azure

Run infrastructure on Azure, AI services on GCP. Same cross-cloud approach as AWS.

**Infrastructure options:**

| Component | Simple (VM) | Production (managed) |
|-----------|------------|---------------------|
| PostgreSQL | Docker container | Azure Database for PostgreSQL Flexible Server |
| Redis | Docker container | Azure Cache for Redis |
| Backend/Frontend | Docker on VM | Azure Container Apps |
| AI/DLP | GCP (cross-cloud) | GCP (cross-cloud) |

**Public access (users connect from anywhere):**

```
Internet
   |
   v
[Application Gateway] -- Azure-managed TLS certificate
   |
   +---> Container Apps: onefend-backend (:3000)
   +---> Container Apps: onefend-frontend (:8080)
   |
   +---> PostgreSQL Flexible Server (private endpoint)
   +---> Azure Cache for Redis (private endpoint)
   +---> GCP AI APIs (outbound internet)
```

1. Create an Application Gateway with Azure-managed certificate in a public subnet
2. Deploy Container Apps with VNet integration in private subnets
3. Backend needs outbound internet to reach GCP AI APIs (default in Container Apps)
4. Map your domain to the Application Gateway public IP
5. Extensions connect to `https://onefend.yourcompany.com/api/v1`

**Private access (users connect only from corporate network):**

```
Azure ExpressRoute / VPN Gateway
   |
   v
[Internal Load Balancer] -- No public IP
   |
   +---> Container Apps: onefend-backend (:3000)
   +---> Container Apps: onefend-frontend (:8080)
   |
   +---> PostgreSQL Flexible Server (private endpoint)
   +---> Azure Cache for Redis (private endpoint)
   +---> GCP AI APIs (via NAT Gateway, outbound only)
```

1. Deploy Container Apps with `--ingress internal` (no public endpoint)
2. Use Private DNS Zones for internal name resolution
3. Users access via ExpressRoute or VPN Gateway
4. Backend needs a NAT Gateway for outbound GCP AI API calls
5. Extensions connect to `https://onefend.internal.yourcompany.com/api/v1` (resolves via private DNS)

```bash
# Using Azure managed DB + cache
DATABASE_URL=postgresql://user:pass@your-server.postgres.database.azure.com:5432/onefend?sslmode=require
REDIS_HOST=your-cache.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=your-access-key

# Deploy with Container Apps
az containerapp create --name onefend-backend \
  --resource-group onefend-rg \
  --image yourregistry.azurecr.io/onefend-backend:latest \
  --env-vars DATABASE_URL=... JWT_SECRET=... REDIS_HOST=... GCP_PROJECT_ID=...

az containerapp create --name onefend-frontend \
  --resource-group onefend-rg \
  --image yourregistry.azurecr.io/onefend-frontend:latest \
  --env-vars BACKEND_INTERNAL_URL=https://your-backend-url/api/v1
  # Note: NEXT_PUBLIC_API_URL is set at build time, not runtime.
  # Build the frontend image with: --build-arg NEXT_PUBLIC_API_URL=/api/v1
```

---

### On-premise / Private network

No cloud required. Runs entirely on internal infrastructure.

**Private access (default):**

```
Corporate network (10.0.0.0/8)
   |
   v
[http://onefend.internal]  <-- Internal server or VM (port 80)
   |         |
   |         +--> nginx (:80) -- reverse proxy
   |         +--> Frontend (:8080)
   |         +--> Backend  (:3000)
   |         +--> PostgreSQL (:5432)
   |         +--> Redis (:6379)
   |
   +-- Extensions connect via internal IP/hostname
```

1. Install Docker on any Linux server
2. Clone repo, configure `.env`, run `docker compose up -d`
3. No reverse proxy needed -- users access Onefend on port 80 (configured via PORT in .env)
4. Build extension with internal backend URL: `VITE_API_BASE_URL=http://10.0.1.50/api/v1`
5. Distribute extension to users via GPO, MDM, or shared drive

**Without GCP (fully offline, air-gapped):**

Onefend works with regex-based detection only. No internet required at all. The backend never makes outbound connections. Ideal for air-gapped environments or organizations with strict egress policies.

**With GCP AI (hybrid):**

Backend needs outbound internet access to reach GCP APIs. Everything else stays internal.

```
Corporate network
   |
   +-- Users --> [Onefend server] (internal only)
   |
   +-- [Onefend server] --> Internet --> GCP AI APIs (outbound only)
```

Add GCP credentials to `.env`. Latency ~100-300ms per first-time analysis, cached in Redis after that.

---

## Configuration Reference

### Backend environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | -- | PostgreSQL connection string |
| `JWT_SECRET` | Yes | -- | Secret for signing JWT tokens (min 32 chars) |
| `REDIS_HOST` | No | `localhost` | Redis host |
| `REDIS_PORT` | No | `6379` | Redis port |
| `REDIS_PASSWORD` | No | -- | Redis password |
| `PORT` | No | `3000` | Backend port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `SERVER_URL` | Yes | `http://localhost` | URL where users access Onefend (used for CORS and email links) |
| `CORS_ORIGIN` | No | -- | Auto-derived from SERVER_URL in Docker. Only set manually for custom setups. |
| `APP_NAME` | No | `Onefend` | Name shown in MFA QR codes |
| `JWT_EXPIRATION` | No | `30d` | JWT token expiration |
| `MAIL_FROM` | No | `no-reply@localhost` | Sender address for emails |
| `COOKIE_DOMAIN` | No | -- | Cookie domain (set for cross-subdomain deployments) |
| `SMTP_HOST` | No | -- | SMTP server for sending emails |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | -- | SMTP username |
| `SMTP_PASS` | No | -- | SMTP password |
| `GCP_PROJECT_ID` | No* | -- | Google Cloud project ID |
| `GCP_CLIENT_EMAIL` | No* | -- | GCP service account email. Not needed on GCP infrastructure (uses ADC). |
| `GCP_PRIVATE_KEY` | No* | -- | GCP service account private key. Not needed on GCP infrastructure (uses ADC). |
| `GCP_KEY_FILE` | No* | -- | Alternative: path to GCP key file |
| `GCP_DOCAI_PROCESSOR_ID` | No* | -- | Document AI processor ID |
| `GCP_MODEL` | Yes* | -- | Gemini model to use (e.g., `gemini-3.1-flash-lite`, `gemini-2.5-flash`). Check available models in your GCP console. |
| `GCP_LOCATION` | No* | `us-central1` | GCP region. Use `us` or `eu` for newer models (3.x+), or specific regions like `us-central1` for older models. |
| `GCP_DOCS_BUCKET` | No | auto-generated | GCS bucket for temp document storage |

*GCP variables are needed for AI-powered detection (content classification, PII redaction, document OCR). Without them, only regex-based pattern matching is available. See [AI and DLP Provider Setup](#ai-and-dlp-provider-setup) for details.

### Frontend environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes (build-time) | `http://localhost:3000/api/v1` | Backend API URL (baked into build) |
| `BACKEND_INTERNAL_URL` | No | -- | Internal URL for server-side API calls (set automatically in Docker) |

For Docker builds, pass as build arg:
```bash
# Public cloud:
docker build --build-arg NEXT_PUBLIC_API_URL=https://onefend.yourcompany.com/api/v1 .
# Private network:
docker build --build-arg NEXT_PUBLIC_API_URL=http://10.0.1.50/api/v1 .
```

### Extension environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | Yes (build-time) | `http://localhost:3000/api/v1` | Backend API URL (baked into build) |

```bash
# Public cloud:
VITE_API_BASE_URL=https://onefend.yourcompany.com/api/v1 npm run build
# Private network:
VITE_API_BASE_URL=http://10.0.1.50/api/v1 npm run build
```

### Desktop agent

The desktop agent reads `API_BASE_URL` from its environment at runtime. Default: `http://localhost:3000/api/v1`.

```bash
# Public cloud:
API_BASE_URL=https://onefend.yourcompany.com/api/v1 ./onefend-desktop-agent
# Private network:
API_BASE_URL=http://10.0.1.50:3000/api/v1 ./onefend-desktop-agent
```

Build prerequisites: Rust toolchain + Tauri CLI.
```bash
cd packages/desktop-agent
cargo install tauri-cli
pnpm install
pnpm build
```

---

## Email Setup (Invitations)

Onefend can send invitation emails to users with enrollment tokens and setup instructions. Without SMTP configured, the mail service runs in mock mode (logs to console) and you share enrollment tokens manually from the dashboard.

To enable email invitations, configure SMTP in your `.env`. Onefend works with any SMTP provider:

**Gmail:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourname@gmail.com
SMTP_PASS=your-app-password    # NOT your Gmail password -- generate an App Password
MAIL_FROM=yourname@gmail.com   # at https://myaccount.google.com/apppasswords
```

**Microsoft 365 / Outlook:**
```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=yourname@yourcompany.com
SMTP_PASS=your-password
MAIL_FROM=yourname@yourcompany.com
```

**SendGrid:**
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your-sendgrid-api-key
MAIL_FROM=noreply@yourcompany.com
```

**Amazon SES:**
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
MAIL_FROM=noreply@yourcompany.com   # must be verified in SES
```

**Any other SMTP server:**
```bash
SMTP_HOST=mail.yourcompany.com
SMTP_PORT=587
SMTP_USER=noreply@yourcompany.com
SMTP_PASS=your-password
MAIL_FROM=noreply@yourcompany.com
```

After configuring, restart the backend: `docker-compose restart backend`

### Invitation flow

1. Admin creates invitations in the dashboard (Deployment page) with user emails
2. Backend generates a unique enrollment token per invitation
3. Email is sent with a setup link and the enrollment token
4. User clicks the link, downloads the extension, enters the token
5. Extension registers with the backend and starts enforcing policies
6. Admin sees the invitation status change from PENDING to INSTALLED

---

## AI and DLP Provider Setup

Onefend has two layers of detection:

1. **Regex-based detection** -- works out of the box, no external services needed. Catches patterns like credit card numbers, SSNs, API keys, etc. using configurable regex rules. Works fully offline on private networks.

2. **AI-powered detection** -- requires a cloud AI provider (needs internet access from the backend). Adds intelligent content classification, risk scoring, PII redaction, and document/image analysis. **This is what makes Onefend significantly more effective** -- regex alone will miss context-dependent sensitive data.

### What you need

| Service | What it does | Why you need it |
|---------|-------------|-----------------|
| **LLM (Gemini, Claude, etc.)** | Classifies content risk, generates summaries, scores conversations | Without this, you only get regex matches -- no contextual understanding of what's being sent to AI tools |
| **Cloud DLP (Google)** | Detects and redacts PII (names, addresses, SSNs, credit cards, etc.) before content reaches AI analysis | Without this, PII detection relies only on regex patterns which miss many formats |
| **Document AI (Google)** | Extracts text from PDFs, images, and documents for analysis | Without this, file attachments sent to AI tools are not inspected |

### Current implementation: Google Cloud

The current codebase uses Google Cloud services (via the `@google/genai` SDK). Choose a Gemini model from the [Vertex AI Model Garden](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models) -- Flash-tier models are fast, cheap, and sufficient for classification tasks.

**Setup steps:**

**1. Create a GCP project**

Go to [console.cloud.google.com](https://console.cloud.google.com) and create a new project (or use an existing one). Note your **Project ID** (visible in the project selector dropdown).

**2. Enable the required APIs**

In the GCP Console, go to **APIs & Services > Library** and enable:
- **Vertex AI API** -- search "Vertex AI" and click Enable
- **Cloud Data Loss Prevention (DLP) API** -- search "DLP" and click Enable
- **Document AI API** (optional) -- only if you want document/image analysis

Or via CLI:
```bash
gcloud services enable aiplatform.googleapis.com dlp.googleapis.com
# Optional:
gcloud services enable documentai.googleapis.com
```

**3. Create a service account**

Go to **IAM & Admin > Service Accounts** and click **Create Service Account**:
- Name: `onefend-backend`
- Click **Create and Continue**
- Grant these roles:
  - `Vertex AI User`
  - `DLP User`
  - `Document AI Editor` (if using Document AI)
  - `Storage Admin` (if using Document AI)
- Click **Done**

Or via CLI:
```bash
gcloud iam service-accounts create onefend-backend --display-name="Onefend Backend"

for role in roles/aiplatform.user roles/dlp.user; do
  gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:onefend-backend@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="$role"
done
```

**4. Download the service account key**

In the service account page, go to **Keys > Add Key > Create New Key > JSON**. Download the file (e.g., `onefend-key.json`).

The JSON file looks like this:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\nMIIEv...\n-----END RSA PRIVATE KEY-----\n",
  "client_email": "onefend-backend@your-project-id.iam.gserviceaccount.com",
  ...
}
```

**5. Add the credentials to your `.env`**

Extract the values from the JSON file and add them to your `.env`:

```bash
GCP_PROJECT_ID=your-project-id
GCP_CLIENT_EMAIL=onefend-backend@your-project-id.iam.gserviceaccount.com
GCP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEv...(full key here)...\n-----END RSA PRIVATE KEY-----\n"
GCP_MODEL=gemini-2.5-flash
GCP_LOCATION=us-central1
```

> **Model and location:** `GCP_MODEL` is required -- there is no default. Check available models in the [Vertex AI Model Garden](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models). For `GCP_LOCATION`, newer models (3.x) require a multi-region location (`us` or `eu`), while older models (2.x) work with specific regions like `us-central1`.

> **GCP-native deployments (Cloud Run, GKE, Compute Engine):** If Onefend runs on GCP infrastructure, you can skip `GCP_CLIENT_EMAIL` and `GCP_PRIVATE_KEY`. The SDK uses Application Default Credentials (ADC) automatically -- just attach a service account with the required roles (`aiplatform.user`, `dlp.user`) to your Cloud Run service or VM. This is more secure (no keys to manage) and faster (internal network).
>
> For ADC, only these variables are needed in your `.env`:
> ```bash
> GCP_PROJECT_ID=your-project-id
> GCP_MODEL=gemini-2.5-flash
> GCP_LOCATION=us-central1
> ```
>
> Attach the service account when deploying:
> ```bash
> gcloud run deploy onefend-backend --service-account=onefend-backend@your-project.iam.gserviceaccount.com
> ```

To extract the private key from the JSON file automatically:
```bash
# Extract project_id
cat onefend-key.json | python3 -c "import sys,json; print(json.load(sys.stdin)['project_id'])"

# Extract client_email
cat onefend-key.json | python3 -c "import sys,json; print(json.load(sys.stdin)['client_email'])"

# Extract private_key (with escaped newlines for .env)
cat onefend-key.json | python3 -c "import sys,json; print(json.load(sys.stdin)['private_key'])"
```

Then restart the backend:
```bash
docker-compose restart backend
```

**6. Document AI processor (optional)**

If you enabled Document AI for document/image analysis:
1. Go to **Document AI > Processors** in the GCP Console
2. Click **Create Processor**
3. Select **OCR** (Optical Character Recognition)
4. Choose a region (e.g., `us`)
5. Note the **Processor ID** (visible in the processor details page)
6. Add to your `.env`:
   ```bash
   GCP_DOCAI_PROCESSOR_ID=your-processor-id
   ```
7. Restart: `docker-compose restart backend`

### Cost estimate

For a team of 100 users with moderate AI tool usage:

| Service | Estimated monthly cost |
|---------|----------------------|
| Gemini (configurable model) | $5-15 (with 7-day semantic cache) |
| Cloud DLP | $1-5 (with 24-hour cache) |
| Document AI | $1-3 (only when documents are analyzed) |
| **Total** | **~$10-25/month** |

Onefend aggressively caches AI and DLP results in Redis (7-day and 24-hour TTL respectively), so repeated identical inputs don't incur additional API costs.

### Without any cloud provider (fully offline)

If you don't configure GCP, Onefend still works with these capabilities:

- Regex-based pattern matching (SSNs, credit cards, API keys, emails, etc.)
- Policy enforcement (block, warn, allow per application)
- AI usage monitoring and event logging
- User enrollment and device management
- Analytics dashboard
- SIEM/Webhook integrations

What you lose without cloud AI:

- No contextual risk scoring (only pattern-match severity)
- No AI-generated summaries of flagged content
- No PII redaction beyond regex patterns
- No document/image content inspection

This mode is ideal for **air-gapped or private network deployments** where the backend cannot reach external APIs.

---

## Extension Distribution

### Recommended: Install from browser stores

The easiest way to distribute the extension to your users:

- **Chrome / Edge / Brave:** Install from the [Chrome Web Store](https://chrome.google.com/webstore) (search "Onefend" or use your organization's private listing)
- **Firefox:** Install from [Firefox Add-ons](https://addons.mozilla.org) (search "Onefend")

After installation, users open the extension and enter their enrollment token to connect to your Onefend server.

### Alternative: Manual distribution

If you need a custom build (e.g., pointing to an internal server), build the extension yourself:

1. Build: `VITE_API_BASE_URL=http://YOUR_SERVER/api/v1 npm run build:chrome`
2. Package: `npm run package:chrome` (creates `onefend-chrome.zip` in `packages/extension/`)
3. Share the zip with users
4. Users extract the zip, go to `chrome://extensions`, enable **Developer Mode**, click **Load unpacked**, and select the extracted folder

**Firefox manual build:**
1. Build: `VITE_API_BASE_URL=http://YOUR_SERVER/api/v1 npm run build:firefox`
2. Package: `npm run package:firefox` (creates `onefend-firefox.zip`)
3. Users open Firefox, go to `about:addons`, click the gear icon, select **Install Add-on From File**, and choose the zip

**Enterprise deployment (GPO/MDM):**
For managed browsers, deploy via Chrome Group Policy or MDM using the Chrome Web Store listing or a self-hosted extension.

### Extension enrollment

Once installed, users enroll their extension using a token:
1. Admin creates enrollment tokens or sends email invitations from the dashboard
2. User opens the extension -- onboarding page appears
3. User enters the enrollment token and their email
4. Extension connects to the backend and starts syncing policies every 15 minutes

---

## Database

### Schema overview

Onefend uses PostgreSQL with Prisma ORM. Key models:

| Model | Description |
|-------|-------------|
| Settings | Instance settings and feature configuration |
| User | User with role, MFA, and password |
| Device | Enrolled browser extension or desktop agent |
| Application | Tracked SaaS/AI application with risk score |
| Policy | Access rule (Allow/Warn/Block/Redact) per app |
| Group | User group for policy assignments |
| ConversationEvent | DLP event log with risk analysis |
| DetectionPattern | Regex pattern for sensitive data detection |
| EnrollmentToken | Token for device registration |
| Invitation | Email invitation with enrollment token |
| Integration | SIEM/Webhook/Syslog export config |
| PlatformConfig | AI platform detection rules (DOM selectors, API endpoints) |
| SystemAuditLog | Admin action audit trail |

### Seed data

```bash
# First-time setup (creates settings + admin user)
cd packages/backend
node seed-simple.js

# Optional: add demo data for testing (30 days of synthetic events)
pnpm seed:demo
```

Default admin: `admin@onefend.local` / `Admin123!`

When using Docker Compose, the `migrate` service handles this automatically on first boot.

### Migrations

```bash
# Development (creates migration files)
npx prisma migrate dev

# Production (applies pending migrations)
npx prisma migrate deploy
```

---

## Redis Usage

Redis is used for:

| Purpose | Key Pattern | TTL |
|---------|------------|-----|
| Config cache | `config:{userId}` | 5 min |
| AI analysis cache | `ai_analysis:{hash}` | 7 days |
| DLP redaction cache | `dlp:redact:{hash}` | 24 hours |
| User context | `user_ctx:v3:{userId}` | 60 sec |
| Excluded domains | `excluded_domains:global:` | 5 min |
| Token blacklist | `token:blacklist:{userId}:{iat}` | Variable |
| Rate limiting | `rate_limit:{userId}:{date}` | 24 hours |
| Login attempt tracking | `login_fail:{identifier}` | 15 min |

Redis is optional but recommended. Without it, caching, rate limiting, and brute force protection are disabled.

---

## API Documentation

Swagger/OpenAPI docs are available at `/api/docs` when the backend is running.

Key endpoints:

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/auth/login` | POST | No | User login |
| `/api/v1/auth/logout` | POST | Yes | Logout (blacklist token) |
| `/api/v1/devices/register` | POST | No | Extension enrollment |
| `/api/v1/config` | GET | Device | Fetch policies and config |
| `/api/v1/patterns/active` | GET | Device | Fetch DLP patterns |
| `/api/v1/platform-configs/active` | GET | Device | Fetch platform detection rules |
| `/api/v1/events` | POST | Device | Log audit events |
| `/api/v1/ai-analysis` | POST | Device | AI content analysis |
| `/api/v1/invitations` | POST | Admin | Create user invitations |
| `/api/v1/applications` | GET | User | List tracked applications |
| `/api/v1/policies` | GET/POST | Admin | Manage policies |
| `/api/v1/analytics/*` | GET | User | Usage analytics |

---

## Security

See [SECURITY.md](SECURITY.md) for the full threat model and OWASP LLM Top 10 mapping.

Key security controls:

- All passwords hashed with bcrypt (10 rounds)
- Brute force protection (5 failed attempts = 15 min lockout)
- JWT tokens with configurable expiration (min 32-char secret enforced)
- TOTP-based MFA with backup codes
- HTTP-only, secure, SameSite=Strict cookies in production
- HTTPS enforcement in production
- Helmet security headers (HSTS, X-Frame-Options, etc.)
- Input validation via class-validator (whitelist mode)
- SSRF prevention on webhook URLs (private IP blocklist)
- Prompt injection sanitization on AI analysis pipeline
- Instance-level cache isolation (DLP + semantic cache)
- CSV formula injection prevention in report exports
- CRLF injection prevention in email delivery
- Rate limiting on authentication and AI endpoints
- 63 security unit tests covering all critical controls

---

## Privacy

Onefend is fully self-hosted. Your data never leaves your infrastructure. Onefend (the company) has zero access to your instance, your database, or your users' activity. There is no telemetry, no analytics, and no phone-home behavior.

If you enable GCP AI services, data is sent to **your own GCP project** using your own credentials -- not to us.

See [PRIVACY.md](PRIVACY.md) for the complete data privacy policy, employee monitoring considerations, and legal disclaimer.

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | NestJS 11, TypeScript, Prisma, PostgreSQL, Redis |
| Frontend | Next.js 16, React 19, TailwindCSS 4, Radix UI, Recharts |
| Extension | Vite, WebExtension API, Manifest V3 |
| Desktop Agent | Tauri 2.0 (Rust), chromiumoxide (CDP), rustls (TLS proxy) |
| AI | Google Vertex AI (configurable Gemini model), Cloud DLP, Document AI |
| Email | Nodemailer (SMTP) |

## Support

**Community support:** Open an issue on [GitHub Issues](https://github.com/emir38/Onefend-Anti-ShadowAI/issues) for bugs, feature requests, or questions.

**Enterprise support:** For deployment assistance, custom integrations, SLAs, and dedicated support, visit [onefend.io](https://onefend.io).

## Roadmap

Onefend is infrastructure-agnostic -- it runs on any cloud or on-premise. The AI provider determines where the intelligent analysis happens:

**Current state:**

| Infrastructure | AI Provider | Status |
|---------------|-------------|--------|
| GCP (Cloud Run, GKE, Compute Engine) | Vertex AI (ADC, no keys needed) | Fully supported |
| AWS (EC2, ECS, Fargate) | Vertex AI (cross-cloud, service account key) | Fully supported |
| Azure (VM, Container Apps) | Vertex AI (cross-cloud, service account key) | Fully supported |
| On-premise | Vertex AI (internet required, service account key) | Fully supported |
| Any infrastructure | Regex-only (no AI, fully offline) | Fully supported |

**Planned AI providers:**

| AI Provider | Infrastructure | Status |
|-------------|---------------|--------|
| Amazon Bedrock (Claude, Llama) | AWS-native or cross-cloud | Next to be integrated |
| Azure OpenAI (GPT-4) | Azure-native or cross-cloud | Planned |
| Self-hosted models (Ollama, vLLM) | Any infrastructure, fully offline AI | Planned |

The codebase is designed with a provider-agnostic `LlmService` abstraction. Adding new AI providers requires implementing a new service class without modifying existing code.

For DLP, Google Cloud DLP is currently the only supported provider. Regex-based detection works as a fallback on all deployments without any cloud dependency.

## Contributing

Contributions are welcome. Please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

Apache License 2.0. See [LICENSE](LICENSE) for details.
