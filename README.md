# OmniView - Free Online Video Search and Streaming Platform

<div align="center">
  <img src="image/logo.png" alt="OmniView Logo">

  [![GitHub stars](https://img.shields.io/github/stars/CrueChan/OmniView?style=social)](https://github.com/CrueChan/OmniView/stargazers)
  [![GitHub forks](https://img.shields.io/github/forks/CrueChan/OmniView?style=social)](https://github.com/CrueChan/OmniView/network)
  [![GitHub issues](https://img.shields.io/github/issues/CrueChan/OmniView)](https://github.com/CrueChan/OmniView/issues)
  [![GitHub license](https://img.shields.io/github/license/CrueChan/OmniView)](https://github.com/CrueChan/OmniView/blob/main/LICENSE)
  [![Docker Pulls](https://img.shields.io/docker/pulls/YOUR_DOCKERHUB/omniview)](https://hub.docker.com/r/YOUR_DOCKERHUB/omniview)

  <p><strong>Stream Freely, Enjoy Fully</strong></p>
</div>

## 📺 Project Introduction

OmniView is a lightweight, free online video search and streaming platform that provides content search and playback services from multiple video sources. No registration required, ready to use out of the box, supports access from various devices. The project combines frontend technology and backend proxy functionality, and can be deployed on various website hosting services that support server-side functions. 

This project is based on [LibreSpark/LibreTV](https://github.com/LibreSpark/LibreTV) **Original Project Portal**: [libretv.is-an.org](https://libretv.is-an.org), and that project is based on a refactored and enhanced version of [bestK/tv](https://github.com/bestK/tv).

## 🚀 Quick Deploy

Choose any of the following platforms and click the one-click deploy button to quickly create your own OmniView instance:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FCrueChan%2FOmniView)  
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/CrueChan/OmniView)  
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/CrueChan/OmniView)
[![Deploy with EdgeOne Pages](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?repository-url=https://github.com/CrueChan/OmniView)

## ⚠️ Security and Privacy Notice

### 🔒 Strongly Recommend Setting Password Protection

For your security and to avoid potential legal risks, we **strongly recommend** setting password protection when deploying:

- **Avoid Public Access**: Instances without password protection can be accessed by anyone and may be maliciously exploited
- **Prevent Copyright Risks**: Public video search services may face complaints and reports from copyright holders
- **Protect Personal Privacy**: Setting a password can limit access scope and protect your usage records

### 📝 Deployment Recommendations

1. **Set Environment Variable `PASSWORD`**: Set a strong password for your instance
2. **Personal Use Only**: Do not publicly share or distribute your instance link
3. **Comply with Local Laws**: Ensure your usage complies with local laws and regulations

### 🚨 Important Disclaimer

- This project is for learning and personal use only
- Do not use the deployed instance for commercial purposes or public services
- Users are solely responsible for any legal issues arising from public sharing
- Project developers are not liable for any legal responsibilities arising from user behavior

## ⚠️ Do Not Use Pull Bot for Auto-Sync

Pull Bot will repeatedly trigger invalid PRs and spam, seriously disrupting project maintenance. The author may directly block all repository owners who use Pull Bot for automatic sync requests.

**Recommended Approach:**

It is recommended to enable the built-in GitHub Actions auto-sync feature in your forked repository (see `.github/workflows/sync.yml`).

If you need to manually sync updates from the main repository, you can also use GitHub's official [Sync fork](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/syncing-a-fork) feature.

### GitHub Actions Workflows

This project includes three automated workflows:

#### 1. **Upstream Sync** (`.github/workflows/sync.yml`)
- **Schedule**: Runs daily at 12 PM UTC+8 (4 AM UTC)
- **Purpose**: Automatically syncs your fork with the upstream repository
- **Trigger**: Scheduled (cron) or manual dispatch
- **Note**: Only works on forked repositories

To enable automatic sync in your fork:
1. Go to your fork's "Actions" tab
2. Enable GitHub Actions if not already enabled
3. The sync workflow will run automatically daily

#### 2. **Version Bump** (`.github/workflows/version.yml`)
- **Trigger**: On push to main branch or manual dispatch
- **Purpose**: Automatically updates version number based on timestamp
- **Actions**: 
  - Updates `VERSION.txt` with current timestamp
  - Commits changes
  - Cleans up old workflow runs (keeps last 2)
- **Note**: Only runs on the main repository (`CrueChan/OmniView`)

#### 3. **Docker Image Build** (`.github/workflows/docker-build.yml`)
- **Trigger**: After successful version bump or manual dispatch
- **Purpose**: Builds and publishes Docker images to Docker Hub
- **Platforms**: 
  - `linux/amd64` (x86_64)
  - `linux/arm64/v8` (ARM 64-bit)
  - `linux/arm/v7` (ARM 32-bit)
- **Tags**: 
  - `latest` (always points to newest version)
  - Version-specific tag (e.g., `202401151200`)
- **Note**: Requires Docker Hub credentials in repository secrets

**For Fork Maintainers**: If you want to build your own Docker images, you need to:
1. Create a Docker Hub account
2. Add repository secrets:
   - `DOCKER_USERNAME`: Your Docker Hub username
   - `DOCKER_PASSWORD`: Your Docker Hub password or access token
3. Modify the workflow file to use your Docker Hub repository

## 📋 Detailed Deployment Guide

### Docker Deployment (Recommended)

Docker provides the easiest and most consistent deployment method across different platforms.

#### Quick Start with Docker

```bash
docker run -d \
  --name omniview \
  --restart unless-stopped \
  -p 8899:8080 \
  -e PASSWORD=your_secure_password \
  -e ADMINPASSWORD=your_admin_password \
  CrueChan/omniview:latest
```

Then visit `http://localhost:8899` to access your instance.

#### Docker Compose (Recommended for Production)

**Step 1: Create project directory**

```bash
mkdir omniview && cd omniview
```

**Step 2: Create `docker-compose.yml` file**

```yaml
services:
  omniview:
    image: CrueChan/omniview:latest
    container_name: omniview
    
    ports:
      - "8899:8080"  # Host port:Container port
    
    environment:
      # Basic Configuration
      - PORT=8080
      - NODE_ENV=production
      - PASSWORD=${PASSWORD:-}
      - ADMINPASSWORD=${ADMINPASSWORD:-}
      - DEBUG=${DEBUG:-false}
      
      # CORS Configuration
      - CORS_ORIGIN=${CORS_ORIGIN:-*}
      
      # Request Configuration
      - REQUEST_TIMEOUT=${REQUEST_TIMEOUT:-5000}
      - MAX_RETRIES=${MAX_RETRIES:-2}
      - USER_AGENT=${USER_AGENT:-Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36}
      
      # Cache Configuration
      - CACHE_MAX_AGE=${CACHE_MAX_AGE:-1d}
      
      # Security Configuration
      - BLOCKED_HOSTS=${BLOCKED_HOSTS:-localhost,127.0.0.1,0.0.0.0,::1}
      - BLOCKED_IP_PREFIXES=${BLOCKED_IP_PREFIXES:-192.168.,10.,172.}
      - FILTERED_HEADERS=${FILTERED_HEADERS:-content-security-policy,cookie,set-cookie,x-frame-options,access-control-allow-origin}
    
    restart: unless-stopped
    
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:8080', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    
    # Optional: Resource limits
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 128M
    
    networks:
      - omniview_network

networks:
  omniview_network:
    driver: bridge
```

**Step 3: Create `.env` file**

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file and set your passwords
nano .env
```

Example `.env` configuration:

```bash
# REQUIRED: Set strong passwords
PASSWORD=YourSecurePassword2024!
ADMINPASSWORD=YourAdminPassword2024!

# Optional configurations
PORT=8080
CORS_ORIGIN=*
DEBUG=false
REQUEST_TIMEOUT=5000
MAX_RETRIES=2
CACHE_MAX_AGE=1d
```

**Step 4: Start the service**

```bash
# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

**Step 5: Access your instance**

Open your browser and navigate to `http://localhost:8899`

#### Building from Source

If you want to build the Docker image yourself:

```bash
# Clone the repository
git clone https://github.com/CrueChan/OmniView.git
cd OmniView

# Create and configure .env file
cp .env.example .env
nano .env  # Set your passwords

# Build and start with Docker Compose
docker-compose up -d --build

# Or build manually
docker build -t omniview:latest .
docker run -d \
  --name omniview \
  -p 8899:8080 \
  --env-file .env \
  omniview:latest
```

#### Docker Management Commands

```bash
# Start service
docker-compose up -d

# Stop service
docker-compose down

# Restart service
docker-compose restart

# View logs (real-time)
docker-compose logs -f omniview

# View logs (last 100 lines)
docker-compose logs --tail=100 omniview

# Check container status
docker-compose ps

# Execute command in container
docker-compose exec omniview sh

# Update to latest version
docker-compose pull
docker-compose up -d

# Clean up (including volumes)
docker-compose down -v
```

#### Reverse Proxy Configuration

For production deployment, it's recommended to use a reverse proxy (Nginx/Caddy) with SSL.

**Nginx Configuration Example:**

```nginx
server {
    listen 443 ssl http2;
    server_name video.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8899;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Streaming optimization
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_http_version 1.1;
    }
}
```

**Caddy Configuration Example:**

```caddy
video.yourdomain.com {
    reverse_proxy localhost:8899 {
        flush_interval -1
    }
}
```

### Cloudflare Pages

1. Fork or clone this repository to your GitHub account
2. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) and go to Pages service
3. Click "Create a project" and connect your GitHub repository
4. Use the following settings:
   - Build command: Leave blank (no build required)
   - Build output directory: Leave blank (defaults to root directory)
5. **⚠️ Important: Add `PASSWORD` variable in "Settings" > "Environment Variables"**
6. **Optional: Add `ADMINPASSWORD` variable in "Settings" > "Environment Variables"**
7. Click "Save and Deploy"

### Vercel

1. Fork or clone this repository to your GitHub/GitLab account
2. Log in to [Vercel](https://vercel.com/) and click "New Project"
3. Import your repository using default settings
4. **⚠️ Important: Add `PASSWORD` variable in "Settings" > "Environment Variables"**
5. **Optional: Add `ADMINPASSWORD` variable in "Settings" > "Environment Variables"**
6. Click "Deploy"

### Render

1. Fork or clone this repository to your GitHub account
2. Log in to [Render](https://render.com/) and click "New Web Service"
3. Select your repository, Render will automatically detect the `render.yaml` configuration file
4. Keep default settings (no need to set environment variables, password protection is disabled by default)
5. Click "Create Web Service" and wait for deployment to complete

> To enable password protection, manually add `PASSWORD` and/or `ADMINPASSWORD` in environment variables in the Render console.

### Local Development Environment

The project includes backend proxy functionality and requires an environment that supports server-side functions:

```bash
# Clone the repository
git clone https://github.com/CrueChan/OmniView.git
cd OmniView

# Copy environment variables
cp .env.example .env

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:8080` to use (port can be modified via PORT variable in .env file).

> ⚠️ Note: When using simple static servers (such as `python -m http.server` or `npx http-server`), video proxy functionality will not be available and videos cannot play properly. For full functionality testing, please use Node.js development server.

## 🔧 Configuration Reference

### Environment Variables

| Variable | Default Value | Description |
|----------|---------------|-------------|
| **Basic Configuration** |
| `PORT` | `8080` | Application listening port |
| `PASSWORD` | Empty | User password ⚠️ **Must be set** |
| `ADMINPASSWORD` | Empty | Admin password (for settings protection) |
| `DEBUG` | `false` | Debug mode |
| **CORS Configuration** |
| `CORS_ORIGIN` | `*` | Allowed CORS origins (use specific domain in production) |
| **Request Configuration** |
| `REQUEST_TIMEOUT` | `5000` | Request timeout in milliseconds |
| `MAX_RETRIES` | `2` | Maximum retry attempts |
| `USER_AGENT` | Chrome UA | User-Agent header for requests |
| **Cache Configuration** |
| `CACHE_MAX_AGE` | `1d` | Cache max age (1 day) |
| **Security Configuration** |
| `BLOCKED_HOSTS` | Local addresses | Comma-separated list of blocked hostnames |
| `BLOCKED_IP_PREFIXES` | Private IPs | Comma-separated list of blocked IP prefixes |
| `FILTERED_HEADERS` | Sensitive headers | Comma-separated list of headers to filter |

### Security Best Practices

#### 1. Set Strong Passwords (Required)

```bash
# .env file
PASSWORD=MyStr0ng@Pass2024!
ADMINPASSWORD=Adm1n$ecure2024!
```

#### 2. Restrict CORS in Production

```bash
# Allow only your domain
CORS_ORIGIN=https://yourdomain.com

# Allow multiple domains
CORS_ORIGIN=https://domain1.com,https://domain2.com
```

#### 3. Use HTTPS with Reverse Proxy

Always deploy behind a reverse proxy (Nginx/Caddy) with SSL certificates in production.

#### 4. Enable Firewall

```bash
# Example: UFW on Ubuntu
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Password Protection

To add password protection to your OmniView instance, set the following environment variables:

**For Regular Users:**
- Variable: `PASSWORD`
- Value: Your desired password

**For Admin Access (Settings):**
- Variable: `ADMINPASSWORD`
- Value: Your desired admin password

Platform-specific setup methods:

- **Docker/Docker Compose**: Set in `.env` file or `-e` flags
- **Cloudflare Pages**: Dashboard > Project > Settings > Environment Variables
- **Vercel**: Dashboard > Project > Settings > Environment Variables
- **Netlify**: Dashboard > Project > Site settings > Build & deploy > Environment
- **Local Development**: Set in `.env` file

### API Compatibility

OmniView supports the standard Apple CMS V10 API format. When adding custom APIs, the following format must be followed:
- Search endpoint: `https://example.com/api.php/provide/vod/?ac=videolist&wd=keyword`
- Detail endpoint: `https://example.com/api.php/provide/vod/?ac=detail&ids=video_id`

**Adding CMS Source**:
1. Select "Custom Interface" in the settings panel
2. Interface address: `https://example.com/api.php/provide/vod`

## ⌨️ Keyboard Shortcuts

The player supports the following keyboard shortcuts:

- **Space**: Play/Pause
- **Left/Right Arrow**: Rewind/Fast Forward
- **Up/Down Arrow**: Volume Up/Down
- **M Key**: Mute/Unmute
- **F Key**: Fullscreen/Exit Fullscreen
- **Esc Key**: Exit Fullscreen

## 🔄 Updating Your Instance

### Docker

```bash
# Pull latest image
docker-compose pull

# Restart with new image
docker-compose up -d

# Or for standalone Docker
docker pull CrueChan/omniview:latest
docker stop omniview
docker rm omniview
# Run with same configuration as before
```

**Using Specific Version**: You can use version-specific tags instead of `latest`:

```bash
# Example: Use version 202401151200
docker pull CrueChan/omniview:202401151200
```

Check available versions on [Docker Hub](https://hub.docker.com/r/CrueChan/omniview/tags).

### Serverless Platforms

Most platforms (Vercel, Netlify, Cloudflare) support automatic deployment:

1. Enable auto-deployment in your platform settings
2. When the main repository updates, your fork will be notified
3. Merge the changes or enable auto-sync using GitHub Actions (see workflow section above)

### Building Custom Docker Images

If you want to build your own Docker images from source:

```bash
# Clone the repository
git clone https://github.com/YourUsername/OmniView.git
cd OmniView

# Build for current platform
docker build -t your-username/omniview:latest .

# Build for multiple platforms (requires Docker Buildx)
docker buildx create --use
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  -t your-username/omniview:latest \
  --push .
```

**Note**: The project's GitHub Actions automatically builds multi-platform images on every version bump.

## 🐛 Troubleshooting

### Videos Not Playing

1. Check if proxy is working: `docker-compose logs omniview | grep proxy`
2. Verify CORS settings in `.env`
3. Check browser console for errors
4. Ensure the video source API is accessible

### Cannot Access Instance

1. Check container status: `docker-compose ps`
2. Verify port binding: `netstat -tlnp | grep 8899`
3. Check firewall settings
4. Review logs: `docker-compose logs -f`

### Performance Issues

1. Increase resource limits in `docker-compose.yml`
2. Adjust timeout settings in `.env`
3. Enable caching by increasing `CACHE_MAX_AGE`
4. Consider using a CDN for static assets

## 🛠️ Tech Stack

- **Frontend**:
  - HTML5 + CSS3 + JavaScript (ES6+)
  - Tailwind CSS for styling
  - HLS.js for HLS stream processing
  - DPlayer video player core
  - localStorage for local storage
  
- **Backend**:
  - Node.js (Express.js framework)
  - Axios for HTTP requests
  - CORS middleware
  - Server-side HLS proxy and processing
  
- **Deployment & DevOps**:
  - Docker for containerization
  - Multi-platform support (amd64, arm64, armv7)
  - GitHub Actions for CI/CD
  - Automated version bumping
  - Automated Docker image builds
  
- **Hosting Platforms**:
  - Cloudflare Pages
  - Vercel
  - Netlify
  - Render
  - Self-hosted (Docker)

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add some amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

Please ensure your PR:
- Follows the existing code style
- Includes appropriate comments
- Updates documentation if needed
- Passes all checks (if any are configured)

### Development Workflow

```bash
# Clone your fork
git clone https://github.com/YourUsername/OmniView.git
cd OmniView

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start development server
npm run dev

# Make your changes and test thoroughly

# Commit and push
git add .
git commit -m "Your descriptive commit message"
git push origin your-branch-name
```

## ⚖️ Disclaimer

OmniView serves only as a video search tool and does not store, upload, or distribute any video content. All videos come from search results provided by third-party API interfaces. For any infringing content, please contact the respective content providers.

The developers of this project are not responsible for any consequences arising from the use of this project. When using this project, you must comply with local laws and regulations.

---

## 📞 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/CrueChan/OmniView/issues)
- **Documentation**: This README and inline code comments
- **Original Project**: [LibreSpark/LibreTV](https://github.com/LibreSpark/LibreTV)

---

**Made with ❤️ by Crue Chan**
