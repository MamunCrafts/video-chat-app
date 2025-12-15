import { Server as NetServer } from 'http'
import { NextApiRequest } from 'next'
import { Server as ServerIO } from 'socket.io'
import { prisma } from '@/lib/prisma'

export const config = {
    api: {
        bodyParser: false,
    },
}

const ioHandler = (req: NextApiRequest, res: any) => {
    if (!res.socket.server.io) {
        const path = '/api/socket/io'
        const httpServer: NetServer = res.socket.server as any
        const io = new ServerIO(httpServer, {
            path: path,
            addTrailingSlash: false,
        })
        res.socket.server.io = io

        io.on('connection', (socket) => {
            console.log('Socket connected:', socket.id)

            socket.on('setup', (userId) => {
                socket.join(userId)
                console.log(`User ${userId} joined their personal room`)
            })

            socket.on('join-room', (roomId, userId) => {
                socket.join(roomId)
                socket.to(roomId).emit('user-connected', userId)
            })

            socket.on('send-message', async (message) => {
                try {
                    // Save to database
                    const savedMessage = await prisma.message.create({
                        data: {
                            content: message.content,
                            senderId: message.senderId,
                            receiverId: message.receiverId,
                        }
                    })

                    const messageToEmit = {
                        ...savedMessage,
                        timestamp: new Date(savedMessage.createdAt).getTime()
                    }

                    // Send to receiver
                    io.to(message.receiverId).emit('receive-message', messageToEmit)
                    // Send to sender (for other tabs/devices)
                    io.to(message.senderId).emit('receive-message', messageToEmit)
                } catch (error) {
                    console.error('Error saving message:', error)
                }
            })

            socket.on('call-user', (data) => {
                socket.to(data.userToCall).emit('call-user', { signal: data.signalData, from: data.from, name: data.name })
            })

            socket.on('answer-call', (data) => {
                socket.to(data.to).emit('call-accepted', data.signal)
            })

            socket.on('disconnect', () => {
                console.log('Socket disconnected:', socket.id)
            })
        })
    }
    res.end()
}

export default ioHandler
