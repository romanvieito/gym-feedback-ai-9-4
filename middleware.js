// middleware.js
import { NextResponse } from 'next/server';

export async function middleware(request) {
    // Obtener el token de la URL
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    try {
        // Usar una variable de entorno para la URL de la API
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/getToken`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.TOKEN_API_KEY}`,
            },
        });

        if (!response.ok) {
            return NextResponse.redirect(new URL('/', request.url));
        }

        const result = await response.json();

        if (token !== result.token) {
            return NextResponse.redirect(new URL('/', request.url));
        }

        return NextResponse.next();
    } catch (error) {
        console.error('Error validating token:', error);
        return NextResponse.redirect(new URL('/', request.url));
    }
}

export const config = {
    matcher: ['/poses/:path*'], // Aplica el middleware solo a las rutas protegidas
};
