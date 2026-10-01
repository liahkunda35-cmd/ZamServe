import { NextResponse, type NextRequest } from "next/server";
import { TOKEN_COOKIE, verifyToken } from "@/lib/token";

const customerPublic = new Set(["/customer/start", "/customer/login", "/customer/register", "/customer/forgot"]);
const providerPublic = new Set(["/provider/start", "/provider/login", "/provider/register", "/provider/forgot"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifyToken(request.cookies.get(TOKEN_COOKIE)?.value);

  if (pathname === "/" || pathname === "/choose-role") {
    if (!session) return NextResponse.next();
    return NextResponse.redirect(new URL(session.role === "PROVIDER" ? "/provider/home" : "/customer/home", request.url));
  }

  if (pathname.startsWith("/customer")) {
    if (customerPublic.has(pathname)) {
      if (session?.role === "CUSTOMER") return NextResponse.redirect(new URL("/customer/home", request.url));
      if (session?.role === "PROVIDER") return NextResponse.redirect(new URL("/provider/home", request.url));
      return NextResponse.next();
    }
    if (session?.role !== "CUSTOMER") {
      return NextResponse.redirect(new URL("/customer/login", request.url));
    }
  }

  if (pathname.startsWith("/provider")) {
    if (providerPublic.has(pathname)) {
      if (session?.role === "PROVIDER") return NextResponse.redirect(new URL("/provider/home", request.url));
      if (session?.role === "CUSTOMER") return NextResponse.redirect(new URL("/customer/home", request.url));
      return NextResponse.next();
    }
    if (session?.role !== "PROVIDER") {
      return NextResponse.redirect(new URL("/provider/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images|uploads).*)"],
};
