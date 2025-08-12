import { NextResponse } from 'next/server';

const protectedRoutes = ['/profile'];
const publicRoutes = ['/login', '/register'];

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // Dev-only auto login bypass: set a dummy token and allow access when enabled
  const devAutoLogin = process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN === 'true';
  if (devAutoLogin) {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      const res = NextResponse.next();
      // Set a dummy httpOnly token cookie for dev only
      res.cookies.set({
        name: 'token',
        value: 'dev-token',
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false,
      });
      return res;
    }
  }

  // Check if the route is protected
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    const token = req.cookies.get('token')?.value;

    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Check if the route is public
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    const token = req.cookies.get('token')?.value;

    if (token) {
      const url = req.nextUrl.clone();
      url.pathname = '/profile';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/profile/:path*', '/login', '/register'],
};
