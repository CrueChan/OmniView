# Contributing Guide

Thank you for your interest in the OmniView project! We welcome all forms of contributions, including but not limited to code submissions, bug reports, feature suggestions, documentation improvements, and more.

## 🚀 Quick Start

### Development Environment Requirements

- Node.js 16.0 or higher
- Git
- Modern browser with ES6 support
- Docker and Docker Compose (optional, for containerized development)

### Local Development Setup

#### Option 1: Traditional Development (Node.js)

1. **Fork the Project**
   ```bash
   # Fork this project to your account via GitHub web interface
   ```

2. **Clone the Repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/OmniView.git
   cd OmniView
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   # Modify the configuration in the .env file as needed
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Access the Application**
   ```
   Open your browser and visit http://localhost:8080
   ```

#### Option 2: Docker Development

Docker provides a consistent development environment across different platforms.

1. **Prerequisites**
   ```bash
   # Install Docker and Docker Compose
   # macOS: Docker Desktop
   # Linux: docker.io and docker-compose
   # Windows: Docker Desktop
   ```

2. **Clone the Repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/OmniView.git
   cd OmniView
   ```

3. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env and set your development passwords
   ```

4. **Build and Start with Docker Compose**
   ```bash
   # Build and start in development mode
   docker-compose up -d --build
   
   # View logs
   docker-compose logs -f
   ```

5. **Access the Application**
   ```
   Open your browser and visit http://localhost:8899
   ```

6. **Stop the Development Environment**
   ```bash
   docker-compose down
   ```

### Docker Development Commands

```bash
# Start services
docker-compose up -d

# View logs (real-time)
docker-compose logs -f

# Restart after code changes
docker-compose restart

# Rebuild after dependency changes
docker-compose up -d --build

# Execute commands in container
docker-compose exec omniview sh

# Stop services
docker-compose down

# Clean up everything (including volumes)
docker-compose down -v
```

## 🤝 How to Contribute

### Reporting Issues

If you discover a bug or wish to suggest a new feature:

1. First check [Issues](https://github.com/CrueChan/OmniView/issues) to ensure the issue hasn't been reported yet
2. Create a new Issue, please include:
   - Clear title and description
   - Steps to reproduce (if it's a bug)
   - Expected behavior vs actual behavior
   - Environment information (browser, OS, Node.js version, Docker version if applicable)
   - Screenshots or error logs (if applicable)

### Submitting Code

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Development**
   - Keep code style consistent
   - Add necessary comments
   - Ensure functionality works properly
   - Update documentation if needed

3. **Test Changes**
   
   **Traditional Testing:**
   ```bash
   # Ensure the application starts normally
   npm run dev
   
   # Test various features
   # - Video search
   # - Video playback
   # - Responsive design
   # - API proxy functionality
   ```
   
   **Docker Testing:**
   ```bash
   # Test with Docker
   docker-compose up -d --build
   
   # Verify container health
   docker-compose ps
   
   # Check logs for errors
   docker-compose logs
   
   # Test the application
   curl http://localhost:8899
   ```
   
   **Multi-platform Docker Testing (Advanced):**
   ```bash
   # Build for multiple platforms
   docker buildx create --use
   docker buildx build \
     --platform linux/amd64,linux/arm64,linux/arm/v7 \
     -t omniview-test:latest .
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "type: concise commit message"
   ```

5. **Push Branch**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**
   - Create a Pull Request on GitHub
   - Fill in detailed PR description
   - Wait for code review
   - Ensure all CI checks pass

### Commit Message Format

Please use the following format for commits:

```
type: brief description

Detailed description (optional)

Related Issue: #123
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation update
- `style`: Code formatting adjustment
- `refactor`: Code refactoring
- `test`: Test-related
- `chore`: Build process or auxiliary tool changes
- `docker`: Docker-related changes
- `ci`: CI/CD configuration changes

**Examples:**
```
feat: add custom player control bar

- Add playback speed adjustment feature
- Optimize progress bar dragging experience
- Add volume memory function

Related Issue: #45
```

```
docker: optimize multi-platform build process

- Add ARM64 support
- Reduce image size by 30%
- Improve build cache efficiency

Related Issue: #78
```

## 📋 Code Standards

### JavaScript Standards

- Use ES6+ syntax
- Prefer `const`, use `let` when reassignment is needed
- Use meaningful variable and function names
- Use camelCase for function names
- Use uppercase letters and underscores for constants

```javascript
// ✅ Recommended
const API_BASE_URL = 'https://api.example.com';
const searchVideos = async (keyword) => {
    // Function implementation
};

// ❌ Not Recommended
var url = 'https://api.example.com';
function search(k) {
    // Function implementation
}
```

### CSS Standards

- Use BEM naming convention or semantic class names
- Prefer CSS variables
- Mobile-first responsive design
- Avoid using `!important`

```css
/* ✅ Recommended */
.video-player {
    --primary-color: #00ccff;
    background-color: var(--primary-color);
}

.video-player__controls {
    display: flex;
    gap: 1rem;
}

/* ❌ Not Recommended */
.player {
    background-color: #00ccff !important;
}
```

### HTML Standards

- Use semantic tags
- Ensure accessibility (add appropriate aria attributes)
- Maintain good indentation formatting

```html
<!-- ✅ Recommended -->
<main class="video-search">
    <section class="search-form" role="search">
        <input type="search" aria-label="Search videos" placeholder="Enter keywords">
        <button type="submit" aria-label="Search">Search</button>
    </section>
</main>

<!-- ❌ Not Recommended -->
<div class="search">
    <input type="text" placeholder="Search">
    <div onclick="search()">Search</div>
</div>
```

### Docker Standards

When contributing Docker-related changes:

- **Optimize Image Size**: Use Alpine-based images, multi-stage builds
- **Security**: Run as non-root user, minimize attack surface
- **Documentation**: Update Docker-related documentation
- **Testing**: Test on multiple platforms (amd64, arm64, armv7)

```dockerfile
# ✅ Recommended
FROM node:lts-alpine
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs
WORKDIR /app
COPY --chown=nodejs:nodejs . .
RUN npm ci --only=production

# ❌ Not Recommended
FROM node:latest
WORKDIR /app
COPY . .
RUN npm install
```

## 🎯 Key Contribution Areas

We especially welcome contributions in the following areas:

### Core Features
- **Search Optimization**: Improve search algorithms and user experience
- **Player Enhancement**: New player features and control options
- **API Integration**: Add support for new video source APIs
- **Performance Optimization**: Loading speed and playback performance improvements
- **Proxy Functionality**: Improve video proxy and streaming capabilities

### User Experience
- **Interface Design**: UI/UX improvements and modernization
- **Responsive Design**: Mobile experience optimization
- **Accessibility Features**: Improve accessibility
- **Internationalization**: Multi-language support
- **Progressive Web App**: PWA features

### Technical Architecture
- **Code Refactoring**: Improve code quality and maintainability
- **Security**: Security vulnerability fixes and protection
- **Deployment Optimization**: Improve deployment processes for various platforms
- **Monitoring & Logging**: Add error monitoring and logging systems
- **Testing**: Add unit tests and integration tests

### Docker & DevOps
- **Container Optimization**: Improve Docker image size and build speed
- **Multi-platform Support**: Enhance ARM/ARM64 compatibility
- **CI/CD Improvements**: Optimize GitHub Actions workflows
- **Deployment Automation**: Improve deployment processes
- **Health Checks**: Add comprehensive health monitoring

### Documentation & Community
- **Documentation Improvement**: API documentation, deployment guides, tutorials
- **Example Projects**: Integration examples and best practices
- **Video Tutorials**: Create setup and usage videos
- **Community Building**: Answer questions and guide newcomers
- **Translation**: Translate documentation to other languages

## 🐳 Docker-Specific Contributions

### Testing Docker Changes

When making Docker-related changes:

1. **Build Locally**
   ```bash
   docker build -t omniview-test .
   ```

2. **Test the Image**
   ```bash
   docker run -p 8899:8080 \
     -e PASSWORD=test123 \
     omniview-test
   ```

3. **Verify Image Size**
   ```bash
   docker images omniview-test
   # Aim for < 200MB
   ```

4. **Test Multi-platform (if applicable)**
   ```bash
   docker buildx build \
     --platform linux/amd64,linux/arm64 \
     -t omniview-test .
   ```

5. **Security Scan**
   ```bash
   docker scan omniview-test
   # Or use: trivy image omniview-test
   ```

### Dockerfile Best Practices

- Use specific base image tags (e.g., `node:18-alpine`, not `node:latest`)
- Combine RUN commands to reduce layers
- Use `.dockerignore` to exclude unnecessary files
- Implement health checks
- Run as non-root user
- Document all ENV variables

### GitHub Actions Workflow Changes

When modifying `.github/workflows/*`:

1. Test locally with [act](https://github.com/nektos/act):
   ```bash
   act -j build
   ```

2. Ensure secrets are properly handled
3. Add comments explaining complex steps
4. Test on different platforms if applicable
5. Update workflow documentation in `GITHUB_ACTIONS.md`

## 📝 Code Review Process

1. **Automated Checks**: PRs will trigger automated tests and builds
2. **Code Review**: Maintainers will review code quality and functionality
3. **Feedback & Modifications**: Modify code based on review comments
4. **Merge**: Merge to main branch after review approval

### Review Criteria

- **Feature Complete**: Functionality works as expected
- **Code Quality**: Follows project coding standards
- **Performance Impact**: No significant impact on application performance
- **Compatibility**: Compatible with existing features and deployment methods
- **Documentation Update**: Update relevant documentation when necessary
- **Docker Compatibility**: If Docker-related, test on multiple platforms
- **Security**: No security vulnerabilities introduced

### Automated Checks

Your PR will automatically trigger:
- Docker multi-platform builds (amd64, arm64, armv7)
- Linting and code style checks (if configured)
- Security scans
- Documentation link validation

## 🚫 Important Notes

### Unacceptable Contributions

- **Infringing Content**: Code or resources with copyright disputes
- **Malicious Code**: Contains viruses, backdoors, or other malicious functionality
- **Commercial Promotion**: Pure commercial advertising or promotion
- **Irrelevant Features**: Features unrelated to the project's core functionality
- **Security Risks**: Code that introduces security vulnerabilities
- **Breaking Changes**: Major breaking changes without discussion

### Legal Requirements

- Ensure your contribution does not infringe on others' copyrights
- Submitted code must be your original work or legally used
- Agree to distribute your contribution under the same Apache-2.0 license as the project
- Do not include sensitive data (passwords, API keys, etc.)

### Security Guidelines

- Never commit `.env` files or sensitive credentials
- Use environment variables for configuration
- Follow OWASP security best practices
- Report security vulnerabilities privately (see SECURITY.md)
- Test for common vulnerabilities (XSS, CSRF, SQL injection, etc.)

## 📞 Contact

If you have any questions or need help:

- **GitHub Issues**: [Report issues or suggestions](https://github.com/CrueChan/OmniView/issues)
- **GitHub Discussions**: [Join community discussions](https://github.com/CrueChan/OmniView/discussions)
- **Email**: Contact project maintainers via GitHub
- **Documentation**: Check [README.md](README.md) and [GITHUB_ACTIONS.md](GITHUB_ACTIONS.md)

## 🙏 Acknowledgments

Thanks to all developers who have contributed to the OmniView project! Every contribution makes this project better.

### Contributors List

We will showcase all contributors in the project README. Once your contribution is merged, your GitHub avatar will appear in the contributors list.

### Recognition Levels

- **🌟 Core Contributors**: Regular contributors with significant impact
- **🔧 Feature Contributors**: Contributors of major features
- **🐛 Bug Hunters**: Contributors who find and fix bugs
- **📚 Documentation Heroes**: Contributors who improve documentation
- **🎨 Design Contributors**: Contributors who improve UI/UX
- **🐳 DevOps Contributors**: Contributors who improve deployment and infrastructure

---

## 🎁 Development Tips

### Useful Development Commands

```bash
# Check code style
npm run lint  # If configured

# Format code
npm run format  # If configured

# Build for production
npm start

# Clean npm cache
npm cache clean --force

# Update dependencies
npm update

# Check for outdated packages
npm outdated
```

### Debugging Tips

**Node.js Debugging:**
```bash
# Enable debug mode
DEBUG=true npm run dev
```

**Docker Debugging:**
```bash
# View container logs
docker-compose logs -f omniview

# Execute shell in container
docker-compose exec omniview sh

# Inspect container
docker inspect omniview

# View container resource usage
docker stats omniview
```

### Performance Testing

```bash
# Test response time
time curl http://localhost:8899

# Load testing (install apache2-utils)
ab -n 1000 -c 10 http://localhost:8899/

# Memory profiling
docker stats omniview
```

---

**Thank you again for your contribution!** 🎉

Let's build a better OmniView together!

For more information:
- [README.md](README.md) - General documentation
- [GITHUB_ACTIONS.md](GITHUB_ACTIONS.md) - CI/CD workflows guide
- [.env.example](.env.example) - Configuration reference