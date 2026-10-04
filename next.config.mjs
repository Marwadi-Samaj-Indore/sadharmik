/** @type {import('next').NextConfig} */
const nextConfig = {
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
