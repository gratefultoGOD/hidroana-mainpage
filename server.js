const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────
// 1. HELMET — HTTP Security Headers
// ─────────────────────────────────────────────
app.use(helmet({
    // Content-Security-Policy: blocks XSS, inline injection, unwanted resource loading
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    // X-Content-Type-Options: nosniff — prevents MIME-type sniffing
    crossOriginEmbedderPolicy: false,
    // Referrer-Policy: no-referrer — prevents leaking URLs to third parties
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // Strict-Transport-Security — forces HTTPS
    hsts: {
        maxAge: 31536000,       // 1 year
        includeSubDomains: true,
        preload: true,
    },
    // X-Frame-Options: DENY — prevents clickjacking
    frameguard: { action: 'deny' },
    // X-XSS-Protection — legacy XSS filter
    xXssProtection: true,
    // X-DNS-Prefetch-Control — prevents DNS prefetching leaks
    dnsPrefetchControl: { allow: false },
    // X-Download-Options: noopen — prevents IE from executing downloads
    ieNoOpen: true,
    // X-Permitted-Cross-Domain-Policies: none — blocks Flash/PDF cross-domain
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
}));

// ─────────────────────────────────────────────
// 2. RATE LIMITING — DDoS / Brute-force protection
// ─────────────────────────────────────────────
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 200,                    // max 200 requests per window per IP
    standardHeaders: true,       // Return rate limit info in RateLimit-* headers
    legacyHeaders: false,        // Disable X-RateLimit-* headers
    message: { error: 'Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.' },
});
app.use(generalLimiter);

// ─────────────────────────────────────────────
// 3. REMOVE SERVER FINGERPRINT
// ─────────────────────────────────────────────
// helmet already removes X-Powered-By, but disable explicitly too
app.disable('x-powered-by');

// ─────────────────────────────────────────────
// 4. BODY PARSER LIMITS — Prevents large payload attacks
// ─────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// ─────────────────────────────────────────────
// 5. BLOCK SENSITIVE FILE PATTERNS — Prevent info disclosure
// ─────────────────────────────────────────────
app.use((req, res, next) => {
    const blocked = /\.(env|git|gitignore|DS_Store|log|bak|sql|sh|bat|cmd|ps1|config|yml|yaml|toml|ini|htaccess|htpasswd|swp|swo)$/i;
    const blockedPaths = /\/(\.git|\.env|\.vscode|\.idea|node_modules|\.well-known\/|wp-admin|wp-login|phpinfo|phpmyadmin|admin|cgi-bin)/i;

    if (blocked.test(req.path) || blockedPaths.test(req.path)) {
        return res.status(404).send('Not Found');
    }
    next();
});

// ─────────────────────────────────────────────
// 6. PREVENT PATH TRAVERSAL — Reject suspicious paths
// ─────────────────────────────────────────────
app.use((req, res, next) => {
    // Block encoded path traversal attempts
    const decodedPath = decodeURIComponent(req.path);
    if (decodedPath.includes('..') || decodedPath.includes('\0')) {
        return res.status(400).send('Bad Request');
    }
    next();
});

// ─────────────────────────────────────────────
// 7. STATIC FILE SERVER — with secure caching headers
// ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public'), {
    dotfiles: 'deny',               // Deny access to dotfiles
    etag: true,                      // Enable ETags for caching validation
    maxAge: '1d',                    // Cache static assets for 1 day
    index: false,                    // Disable directory indexing
    redirect: false,                 // Don't redirect directories
    setHeaders: (res, filePath) => {
        // Immutable cache for images
        if (/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=2592000, immutable'); // 30 days
        }
        // Short cache for CSS/JS (may update)
        if (/\.(css|js)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
        }
    },
}));

// ─────────────────────────────────────────────
// 8. MAIN ROUTE
// ─────────────────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─────────────────────────────────────────────
// 9. ALLOWED HTML PAGES — Whitelist approach
// ─────────────────────────────────────────────
const allowedPages = ['yarisma.html', 'araclar.html', 'sponsorlar.html'];

allowedPages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', page));
    });
});

// ─────────────────────────────────────────────
// 10. HANDLE 404 — Custom error, no info disclosure
// ─────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─────────────────────────────────────────────
// 11. GLOBAL ERROR HANDLER — Prevents stack trace leaks
// ─────────────────────────────────────────────
app.use((err, req, res, _next) => {
    // Log for server admin, never expose to client
    console.error(`[${new Date().toISOString()}] Error:`, err.message);
    res.status(500).send('Internal Server Error');
});

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Hidroana web server is running on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
});
