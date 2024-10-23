import { NextResponse } from "next/server";
import { sql } from '@vercel/postgres';

export async function GET(request: Request) {

    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
        return NextResponse.json({ status: 401, message: 'No api key provided' });
    }

    const apikey = authHeader.split(' ')[1]; // Asumimos que el formato es "Bearer <token>"

    // Verificar el api key
    const isValid = validateApiKey(apikey);
    if (!isValid) {
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

// Función para validar el api key
const validateApiKey = async (apikey: string) => {
    const token_api_key = process.env.TOKEN_API_KEY || '';
    return token_api_key === apikey;
};