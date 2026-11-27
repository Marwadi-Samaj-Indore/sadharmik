/** @type {import('next').NextConfig} */
/**
 * Sent with every response. A full script CSP would need per-request nonces
 * through every page, so this sets the directives that cost nothing and break
 * nothing: no framing (clickjacking), no plugins, forms and <base> pinned to
 * this origin, no MIME sniffing, and referrers trimmed to the origin so a
 * member's profile URL never leaks to an outside link.
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self' https://*.supabase.co https://accounts.google.com",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig = {
  // Don't advertise the framework and version to anyone scanning for targets
  poweredByHeader: false,
  async headers() {
    return [
      // Every route except the file route, which sets its own policy per file
      // type (a sandbox for images; Chrome refuses to show a sandboxed PDF)
      { source: "/((?!api/photo/).*)", headers: securityHeaders },
      // Phones check for a new service worker on every visit; caching it
      // would leave members running an old one for a day after a fix
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
  // Member photos are user-uploaded and served from local storage in the
  // prototype; Supabase storage URLs get added here at migration time.
  images: { remotePatterns: [] },
  // The dev-mode "N" badge sits exactly over the Home tab at phone size,
  // which poisons every Playwright capture with what looks like a shipped
  // defect. Dev-only setting; production builds never show it anyway.
  devIndicators: false,
  experimental: {
    // Uploads travel to the server inside the server action's own body, as a
    // data URL, and Next caps that at 1MB by default — enough for a cropped
    // avatar and not for a scanned circular or a poster. Raised, not removed:
    // Vercel refuses any function request body over 4.5MB regardless of what
    // is set here, so the forms cap the file itself well below that.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
