import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isProtectedRoute =
    pathname.startsWith("/homepage") ||
    pathname.startsWith("/workspace") ||
    pathname.startsWith("/debugging") ||
    pathname.startsWith("/profile");

  // Redirect unauthenticated users away from protected routes
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth routes
  if (user && (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/signup"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/homepage";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/homepage/:path*",
    "/workspace/:path*",
    "/debugging/:path*",
    "/profile/:path*",
    "/auth/:path*",
  ],
};
