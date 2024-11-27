// middleware.js (or middleware.ts)

import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode('h7F!yN8$wLpX@x9&c2ZvQk3*oT5#aEg4rJ6^pBmN!A'); // Ensure this matches your backend

// Define protected and public routes
const protectedRoutes = ['/profile'];
const publicRoutes = ['/login', '/register'];

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Check if the route is protected
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    const token = req.cookies.get('token')?.value; // Get the token from cookies

    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    try {
      // Verify JWT using jose
      const { payload } = await jwtVerify(token, JWT_SECRET, { algorithms: ['HS256'] });
      // Optionally, you can attach user info to the request if needed
      return NextResponse.next();
    } catch (error) {
      console.error('JWT verification failed:', error.message);
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // Check if the route is public
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    const token = req.cookies.get('token')?.value; // Get the token from cookies

    if (token) {
      try {
        // Verify JWT using jose
        await jwtVerify(token, JWT_SECRET, { algorithms: ['HS256'] });
        const url = req.nextUrl.clone();
        url.pathname = '/profile'; // Redirect to profile if authenticated
        return NextResponse.redirect(url);
      } catch (error) {
        // If token is invalid, allow access to public routes
        return NextResponse.next();
      }
    }

    // If no token, allow access to public routes
    return NextResponse.next();
  }

  // For all other routes, proceed as normal
  return NextResponse.next();
}

// Apply middleware to specific routes
export const config = {
  matcher: ['/profile/:path*', '/login', '/register'],
};
