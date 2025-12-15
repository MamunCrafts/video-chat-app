import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('token')?.value

        if (!token) {
            return NextResponse.json({ user: null })
        }

        const payload = verifyToken(token) as { userId: string } | null

        if (!payload) {
            return NextResponse.json({ user: null })
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, name: true },
        })

        return NextResponse.json({ user })
    } catch (error) {
        console.error('Me error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
