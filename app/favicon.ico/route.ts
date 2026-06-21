export const dynamic = "force-static";

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#1570ef"/>
  <circle cx="48" cy="16" r="9" fill="#facc15"/>
  <path d="M10 44c8-12 18-18 30-18 5 0 10 1 14 4v24H10Z" fill="#22c55e"/>
  <text x="32" y="37" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#fff">LL</text>
</svg>`;

export function GET() {
  return new Response(iconSvg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
