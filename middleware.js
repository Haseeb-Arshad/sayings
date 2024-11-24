import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';


// const JWT_SECRET = 'h7F!yN8$wLpX@x9&c2ZvQk3*oT5#aEg4rJ6^pBmN!A';


const JWT_SECRET = new TextEncoder().encode('h7F!yN8$wLpX@x9&c2ZvQk3*oT5#aEg4rJ6^pBmN!A');

// Define routes that require authentication
const protectedRoutes = ['/profile'];

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Check if the route is protected
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    const token = req.cookies.get('token')?.value; // Updated to get cookie in Edge Runtime

    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    try {
      // Verify JWT using jose
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch (error) {
      console.error('JWT verification failed:', error);
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Apply middleware to specific routes
export const config = {
  matcher: ['/profile/:path*'],
};
