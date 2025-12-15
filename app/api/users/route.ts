import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('token')?.value

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const payload = verifyToken(token) as { userId: string } | null

        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const users = await prisma.user.findMany({
            where: {
                NOT: {
                    id: payload.userId,
                },
            },
            select: { id: true, email: true, name: true },
        })

        return NextResponse.json({ users })
    } catch (error) {
        console.error('Users error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
