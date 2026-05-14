const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.github.com https://api.osv.dev https://openrouter.ai https://api.openai.com; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';",
};

// HSTS header should only be set in production over HTTPS
if (process.env.NODE_ENV === "production") {
  securityHeaders["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload";
}

export function securityHeadersMiddleware(req, res, next) {
  for (const [header, value] of Object.entries(securityHeaders)) {
    res.setHeader(header, value);
  }
  next();
}
