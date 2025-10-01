# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please send an email to security@yourproject.com or create a private security advisory on GitHub.

**Please do not report security vulnerabilities through public GitHub issues.**

### What to Include

- Type of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Time

We aim to respond to security reports within 48 hours and provide a fix within 7 days for critical vulnerabilities.

## Security Best Practices

When deploying OmniView:

1. **Always set strong passwords**
   - Use PASSWORD and ADMINPASSWORD environment variables
   - Use passwords with at least 12 characters, including uppercase, lowercase, numbers, and symbols

2. **Use HTTPS**
   - Deploy behind a reverse proxy with SSL/TLS
   - Use Let's Encrypt for free SSL certificates

3. **Restrict CORS**
   - In production, set CORS_ORIGIN to your specific domain
   - Avoid using wildcard (*) in production

4. **Keep Updated**
   - Regularly update to the latest version
   - Monitor security advisories

5. **Firewall Configuration**
   - Only expose necessary ports
   - Use UFW or iptables to restrict access

## Known Security Features

- Password-protected access
- SSRF prevention (blocks internal IPs)
- Header filtering for sensitive information
- Non-root Docker container execution
- Environment-based configuration (no hardcoded secrets)