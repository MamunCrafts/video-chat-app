'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSocket } from '@/components/SocketProvider'
import Peer from 'peerjs'
import { Avatar } from '@/components/Avatar'
import { VideoCall } from '@/components/VideoCall'
import { Search, Phone, Video, MoreHorizontal, Send, Image as ImageIcon, Smile, Settings, X } from 'lucide-react'

type User = {
  id: string
  email: string
  name: string | null
}

type Message = {
  senderId: string
  content: string
  timestamp: number
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [call, setCall] = useState<any>(null)
  const [callAccepted, setCallAccepted] = useState(false)
  const [callEnded, setCallEnded] = useState(false)
  const [caller, setCaller] = useState('')
  const [callerName, setCallerName] = useState('')
  const [receivingCall, setReceivingCall] = useState(false)
  const [me, setMe] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isVideoCall, setIsVideoCall] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [newName, setNewName] = useState('')

  const myVideo = useRef<HTMLVideoElement>(null)
  const userVideo = useRef<HTMLVideoElement>(null)
  const connectionRef = useRef<any>(null)
  const peerRef = useRef<Peer | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const router = useRouter()
  const { socket, isConnected } = useSocket()

  useEffect(() => {
    // Check auth
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.push('/signin')
        } else {
          setUser(data.user)
          setMe(data.user.id)
        }
      })

    // Fetch users
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        if (data.users) setUsers(data.users)
      })
  }, [router])

  useEffect(() => {
    if (user && socket) {
      // Initialize Peer
      import('peerjs').then(({ default: Peer }) => {
        const peer = new Peer(user.id)
        peerRef.current = peer

        peer.on('open', (id) => {
          console.log('My peer ID is: ' + id)
        })

        peer.on('call', (call) => {
          setReceivingCall(true)
          setCaller(call.peer)
          setCallerName(call.metadata?.name || 'Unknown')
          setIsVideoCall(call.metadata?.video !== false)
          setCall(call)
        })
      })

      socket.emit('setup', user.id)

      socket.on('receive-message', (message: Message) => {
        // Prevent duplicates for sender (since we added optimistically)
        if (message.senderId === user.id) return
        setMessages((prev) => [...prev, message])
      })
    }
  }, [user, socket])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const audio = new Audio('/ringtone.mp3')
    audio.loop = true

    if (receivingCall && !callAccepted) {
      audio.play().catch((e) => console.log('Audio play failed', e))
    }

    return () => {
      audio.pause()
      audio.currentTime = 0
    }
  }, [receivingCall, callAccepted])

  const sendMessage = () => {
    if (inputMessage && selectedUser && socket) {
      const message = {
        senderId: user!.id,
        receiverId: selectedUser.id,
        content: inputMessage,
        timestamp: Date.now(),
        roomId: [user!.id, selectedUser.id].sort().join('-')
      }
      socket.emit('send-message', message)
      setMessages((prev) => [...prev, message])
      setInputMessage('')
    }
  }

  const callUser = (id: string, video: boolean = true) => {
    setCallEnded(false)
    if (!navigator.mediaDevices) {
      alert('Video calling is only available on localhost or HTTPS.')
      return
    }
    navigator.mediaDevices.getUserMedia({ video, audio: true }).then((currentStream) => {
      setStream(currentStream)
      if (myVideo.current) myVideo.current.srcObject = currentStream

      const call = peerRef.current!.call(id, currentStream, {
        metadata: { name: user?.name || user?.email, video }
      })

      if (!call) {
        console.error('Failed to initiate call')
        return
      }

      setCall(call)

      call.on('stream', (userStream) => {
        if (userVideo.current) userVideo.current.srcObject = userStream
      })

      call.on('close', () => {
        setCallEnded(true)
        leaveCall()
      })

      connectionRef.current = call
    })
  }

  const answerCall = () => {
    setCallAccepted(true)
    if (!navigator.mediaDevices) {
      alert('Video calling is only available on localhost or HTTPS.')
      return
    }
    navigator.mediaDevices.getUserMedia({ video: isVideoCall, audio: true }).then((currentStream) => {
      setStream(currentStream)
      if (myVideo.current) myVideo.current.srcObject = currentStream

      call.answer(currentStream)

      call.on('stream', (userStream: MediaStream) => {
        if (userVideo.current) userVideo.current.srcObject = userStream
      })
    })
  }

  const leaveCall = () => {
    setCallEnded(true)
    if (connectionRef.current) connectionRef.current.close()
    if (stream) stream.getTracks().forEach(track => track.stop())
    setStream(null)
    setCallAccepted(false)
    setReceivingCall(false)
  }

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks()[0].enabled = !stream.getAudioTracks()[0].enabled
      setIsMuted(!isMuted)
    }
  }

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks()[0].enabled = !stream.getVideoTracks()[0].enabled
      setIsVideoOff(!isVideoOff)
    }
  }

  const updateProfile = async () => {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        setIsSettingsOpen(false)
      }
    } catch (error) {
      console.error('Failed to update profile', error)
    }
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Chats</h1>
            <div className="flex space-x-2">
              <div
                className="p-2 bg-gray-100 rounded-full cursor-pointer hover:bg-gray-200"
                onClick={() => {
                  setNewName(user?.name || '')
                  setIsSettingsOpen(true)
                }}
              >
                <Settings size={20} />
              </div>
              <div className="p-2 bg-gray-100 rounded-full cursor-pointer hover:bg-gray-200">
                <MoreHorizontal size={20} />
              </div>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search Messenger"
              className="w-full bg-gray-100 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {users.map((u) => (
            <div
              key={u.id}
              onClick={() => {
                setSelectedUser(u)
                if (socket && user) {
                  const roomId = [user.id, u.id].sort().join('-')
                  socket.emit('join-room', roomId, user.id)
                }
              }}
              className={`flex items-center p-3 cursor-pointer hover:bg-gray-100 transition ${selectedUser?.id === u.id ? 'bg-blue-50' : ''}`}
            >
              <Avatar name={u.name} email={u.email} size="lg" />
              <div className="ml-3 flex-1">
                <h3 className="font-semibold text-gray-900">{u.name || u.email}</h3>
                <p className="text-sm text-gray-500 truncate">Click to start chatting</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center">
            <Avatar name={user?.name} email={user?.email} size="md" />
            <div className="ml-3">
              <p className="text-sm font-medium">{user?.name || user?.email}</p>
              <button onClick={() => {
                document.cookie = 'token=; Max-Age=0; path=/;'
                router.push('/signin')
              }} className="text-xs text-red-500 hover:underline">Log Out</button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4 shadow-sm z-10">
              <div className="flex items-center">
                <Avatar name={selectedUser.name} email={selectedUser.email} />
                <div className="ml-3">
                  <h2 className="font-semibold text-gray-900">{selectedUser.name || selectedUser.email}</h2>
                  <p className="text-xs text-green-500 font-medium">Active now</p>
                </div>
              </div>
              <div className="flex space-x-4 text-blue-500">
                <Phone
                  className="cursor-pointer hover:bg-gray-100 p-2 rounded-full box-content"
                  size={24}
                  onClick={() => callUser(selectedUser.id, false)}
                />
                <Video
                  className="cursor-pointer hover:bg-gray-100 p-2 rounded-full box-content"
                  size={24}
                  onClick={() => callUser(selectedUser.id, true)}
                />
                <MoreHorizontal className="cursor-pointer hover:bg-gray-100 p-2 rounded-full box-content" size={24} />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === user?.id
                return (
                  <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {!isMe && <Avatar name={selectedUser.name} size="sm" className="mr-2 self-end" />}
                    <div
                      className={`max-w-[70%] px-4 py-2 rounded-2xl ${isMe
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-gray-200 text-gray-900 rounded-bl-none'
                        }`}
                    >
                      <p>{msg.content}</p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 flex items-center space-x-2">
              <div className="flex space-x-2 text-blue-500">
                <ImageIcon size={24} className="cursor-pointer hover:bg-gray-100 p-1 rounded-full" />
                <Smile size={24} className="cursor-pointer hover:bg-gray-100 p-1 rounded-full" />
              </div>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Aa"
                  className="w-full bg-gray-100 rounded-full py-2 px-4 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <Send
                  size={20}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition ${inputMessage ? 'text-blue-500' : 'text-gray-400'}`}
                  onClick={sendMessage}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MoreHorizontal size={48} className="text-gray-300" />
            </div>
            <h2 className="text-xl font-semibold text-gray-700">No chat selected</h2>
            <p className="mt-2">Select a user from the sidebar to start messaging.</p>
          </div>
        )}

        {/* Video Call Overlay */}
        {(stream || receivingCall) && (
          <VideoCall
            stream={stream}
            callAccepted={callAccepted}
            callEnded={callEnded}
            userVideo={userVideo}
            myVideo={myVideo}
            callerName={callerName || 'Unknown'}
            onLeave={leaveCall}
            isMuted={isMuted}
            toggleMute={toggleMute}
            isVideoOff={isVideoOff}
            toggleVideo={toggleVideo}
          />
        )}

        {/* Incoming Call Notification (if not yet accepted/rejected and not in call) */}
        {receivingCall && !callAccepted && !stream && (
          <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-xl border border-gray-200 z-50 animate-bounce-subtle">
            <div className="flex items-center space-x-4">
              <Avatar name={callerName} size="lg" />
              <div>
                <h3 className="font-bold text-gray-900">{callerName}</h3>
                <p className="text-sm text-gray-500">Incoming video call...</p>
              </div>
            </div>
            <div className="mt-4 flex space-x-2">
              <button onClick={answerCall} className="flex-1 bg-green-500 text-white py-2 rounded-lg font-semibold hover:bg-green-600">
                Accept
              </button>
              <button onClick={leaveCall} className="flex-1 bg-red-500 text-white py-2 rounded-lg font-semibold hover:bg-red-600">
                Decline
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Profile Settings</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={updateProfile}
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
