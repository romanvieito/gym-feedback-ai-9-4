import { NextResponse } from "next/server";
import { sql } from '@vercel/postgres';
import { randomBytes } from 'crypto';

export async function GET(request) {

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
        // Generar un token aleatorio usando crypto
        const token = randomBytes(32).toString('hex');

        // Almacenar el token en la base de datos
        await sql`INSERT INTO tokens (token) VALUES (${token});`;

        //console.log(`Token generado y almacenado: ${token}`);
        return NextResponse.json({ status: 200, message: 'OK'/*, token: token*/ });

    } catch (err) {
        console.error('Error al generar el token:', err);
        return NextResponse.json({ status: 500, message: 'ERROR'/*, error: err*/ });
    }
}

// Función para validar el api key
const validateApiKey = async (apikey) => {
    const token_api_key = process.env.TOKEN_API_KEY || '';
    return token_api_key === apikey;
};