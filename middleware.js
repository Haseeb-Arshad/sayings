import { NextResponse } from 'next/server';

const protectedRoutes = ['/profile'];
const publicRoutes = ['/login', '/register'];

export function middleware(req) {
  const { pathname } = req.nextUrl;

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
