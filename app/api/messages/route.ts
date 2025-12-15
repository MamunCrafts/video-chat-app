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

        const { searchParams } = new URL(req.url)
        const otherUserId = searchParams.get('otherUserId')

        if (!otherUserId) {
            return NextResponse.json({ error: 'Missing otherUserId' }, { status: 400 })
        }

        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: payload.userId, receiverId: otherUserId },
                    { senderId: otherUserId, receiverId: payload.userId },
                ],
            },
            orderBy: {
                createdAt: 'asc',
            },
        })

        // Convert dates to timestamps to match frontend Message type
        const formattedMessages = messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.createdAt).getTime()
        }))

        return NextResponse.json({ messages: formattedMessages })
    } catch (error) {
        console.error('Messages fetch error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
