/** Turn Supabase Auth API errors into clearer copy for the UI. */
export function formatAuthErrorMessage(raw: string): { text: string; variant: "error" | "warning" } {
  const lower = raw.toLowerCase();
  if (lower.includes("rate limit") && lower.includes("email")) {
    return {
      variant: "warning",
      text: [
        "The app has sent too many auth emails recently (Supabase’s hourly limit).",
        "",
        "Try again in about an hour. If you’re the project owner: Supabase Dashboard → Authentication → check email rate limits, or add custom SMTP (higher limits on paid plans).",
      ].join("\n"),
    };
  }
  return { variant: "error", text: raw };
}
