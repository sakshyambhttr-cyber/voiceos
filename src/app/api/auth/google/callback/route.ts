import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const origin = new URL(req.url).origin;
  
  if (!code) {
    return NextResponse.redirect(`${origin}/?oauth_error=no_code`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || "mock-client-id";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

  // Mock flow for development / test environment
  if (code === "mock-code" || clientId === "mock-client-id") {
    const mockAccessToken = "mock-access-token-" + Math.random().toString(36).slice(2);
    const mockRefreshToken = "mock-refresh-token-" + Math.random().toString(36).slice(2);
    const mockExpiry = Date.now() + 3600 * 1000; // 1 hour

    return NextResponse.redirect(
      `${origin}/?oauth_success=true&access_token=${mockAccessToken}&refresh_token=${mockRefreshToken}&expiry_date=${mockExpiry}&provider=mock`
    );
  }

  try {
    const redirectUri = `${origin}/api/auth/google/callback`;
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[OAuth Callback] Token exchange failed:", errText);
      return NextResponse.redirect(`${origin}/?oauth_error=exchange_failed`);
    }

    const data = await res.json();
    const expiryDate = Date.now() + data.expires_in * 1000;

    return NextResponse.redirect(
      `${origin}/?oauth_success=true&access_token=${data.access_token}&refresh_token=${data.refresh_token || ""}&expiry_date=${expiryDate}&provider=google`
    );
  } catch (err) {
    console.error("[OAuth Callback] Exception:", err);
    return NextResponse.redirect(`${origin}/?oauth_error=server_exception`);
  }
}
