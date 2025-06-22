import { NextRequest, NextResponse } from "next/server";
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {

    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
        return NextResponse.json({ status: 401, message: 'No api key provided' });
    }

    if (authHeader !== `Bearer ${process.env.TOKEN_API_KEY}`) {
        return NextResponse.json({ status: 403, message: 'Invalid api key' });
    }

    try {
        const result = await sql`SELECT token FROM tokens ORDER BY created_at DESC LIMIT 1;`;
        const token = result.rows[0]?.token;

        return NextResponse.json({ status: 200, message: 'OK', token: token });

    } catch (err) {
        console.error('Error al generar el token:', err);
        return NextResponse.json({ status: 500, message: 'ERROR', error: err });
    }
}