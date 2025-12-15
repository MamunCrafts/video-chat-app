'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSocket } from '@/components/SocketProvider'
import Peer from 'peerjs'
import { Avatar } from '@/components/Avatar'
import { VideoCall } from '@/components/VideoCall'
import { Search, Phone, Video, MoreHorizontal, Send, Image as ImageIcon, Smile, Settings, X, ArrowLeft } from 'lucide-react'

type User = {
  id: string
  email: string
  name: string | null
}

type Message = {
  senderId: string
  receiverId?: string
  content: string
  timestamp: number
  roomId?: string
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
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)

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
        // Check if peer already exists to avoid duplicates
        if (peerRef.current) return

        const peer = new Peer(user.id)
        peerRef.current = peer

        peer.on('open', (id) => {
          console.log('My peer ID is: ' + id)
        })

        peer.on('error', (err) => {
          console.error('Peer connection error:', err)
        })

        peer.on('call', (call) => {
          setReceivingCall(true)
          setCaller(call.peer)
          setCallerName(call.metadata?.name || 'Unknown')
          setIsVideoCall(call.metadata?.video !== false)
          setCall(call)
          connectionRef.current = call
        })
      })

      socket.emit('setup', user.id)

      const handleMessage = (message: Message) => {
        // Prevent duplicates for sender (since we added optimistically)
        if (message.senderId === user.id) return

        // Only append if it belongs to the current conversation
        if (selectedUser &&
          ((message.senderId === selectedUser.id && message.receiverId === user.id) ||
            (message.senderId === user.id && message.receiverId === selectedUser.id))
        ) {
          setMessages((prev) => [...prev, message])
        }
      }

      socket.on('receive-message', handleMessage)

      return () => {
        socket.off('receive-message', handleMessage)
        if (peerRef.current) {
          peerRef.current.destroy()
          peerRef.current = null
        }
      }
    }
  }, [user, socket, selectedUser])

  useEffect(() => {
    if (selectedUser && user) {
      setMessages([])
      setIsLoadingMessages(true)
      fetch(`/api/messages?otherUserId=${selectedUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.messages) {
            setMessages(data.messages)
          }
        })
        .catch(err => console.error('Failed to load messages', err))
        .finally(() => setIsLoadingMessages(false))
    }
  }, [selectedUser, user])

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
    setCallerName(selectedUser?.name || selectedUser?.email || 'Unknown') // Set name for outgoing call display
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

      const currentCall = call || connectionRef.current
      if (currentCall) {
        try {
          currentCall.answer(currentStream)
          currentCall.on('stream', (userStream: MediaStream) => {
            if (userVideo.current) userVideo.current.srcObject = userStream
          })
          // Update ref if not set (though it should be)
          if (!connectionRef.current) connectionRef.current = currentCall
        } catch (error) {
          console.error('Failed to answer call:', error)
        }
      } else {
        console.error('No call found to answer')
      }
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
      <div className={`
        flex-col border-r border-slate-800 bg-slate-900 text-slate-100
        w-full md:w-80 
        ${selectedUser ? 'hidden md:flex' : 'flex'}
      `}>
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <Avatar name={user?.name} className="ring-2 ring-indigo-500" />
            <div>
              <div className="font-bold text-lg">{user?.name}</div>
              <div className="text-xs text-indigo-400 font-medium">Online</div>
            </div>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <Settings size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-500" size={20} />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border-none rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {users.filter(u => u.id !== user?.id).map((u) => (
            <div
              key={u.id}
              onClick={() => {
                setSelectedUser(u)
                if (socket && user) {
                  const roomId = [user.id, u.id].sort().join('-')
                  socket.emit('join-room', roomId, user.id)
                }
              }}
              className={`flex items-center p-3 rounded-xl cursor-pointer transition-all duration-200 ${selectedUser?.id === u.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                }`}
            >
              <Avatar name={u.name} email={u.email} className={`${selectedUser?.id === u.id ? 'ring-2 ring-white/30' : ''}`} />
              <div className="ml-3">
                <div className="font-medium">{u.name || u.email}</div>
                <div className={`text-xs ${selectedUser?.id === u.id ? 'text-indigo-200' : 'text-slate-500'}`}>Tap to chat</div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Avatar name={user?.name} email={user?.email} size="md" className="ring-1 ring-slate-700" />
              <div className="ml-3">
                <p className="text-sm font-medium text-slate-200">{user?.name || user?.email}</p>
                <button onClick={() => {
                  document.cookie = 'token=; Max-Age=0; path=/;'
                  router.push('/signin')
                }} className="text-xs text-red-400 hover:text-red-300 transition-colors">Log Out</button>
              </div>
            </div>
            <button className="p-2 text-slate-400 hover:bg-slate-800 rounded-full hover:text-white transition-colors">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`
        flex-col relative bg-slate-50
        w-full md:flex-1 
        ${selectedUser ? 'flex' : 'hidden md:flex'}
      `}>
        {selectedUser ? (
          <>
            <div className="h-20 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 shadow-sm z-10 sticky top-0">
              <div className="flex items-center">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="mr-3 md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <ArrowLeft size={24} />
                </button>
                <Avatar name={selectedUser.name} email={selectedUser.email} size="lg" className="ring-2 ring-slate-100" />
                <div className="ml-4">
                  <div className="font-bold text-slate-800 text-lg">{selectedUser.name || selectedUser.email}</div>
                  <div className="text-xs text-green-500 font-medium flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                    Active Now
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => callUser(selectedUser.id, false)}
                  className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                >
                  <Phone size={22} />
                </button>
                <button
                  onClick={() => callUser(selectedUser.id, true)}
                  className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                >
                  <Video size={22} />
                </button>
                <button className="p-3 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                  <MoreHorizontal size={22} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 scroll-smooth">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col space-y-4 pb-4">
                    {messages.map((m, i) => {
                      const isMe = m.senderId === user?.id
                      return (
                        <div
                          key={i}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                        >
                          {!isMe && (
                            <Avatar
                              name={selectedUser.name}
                              size="sm"
                              className="mt-auto mr-2 shadow-sm"
                            />
                          )}
                          <div
                            className={`max-w-[70%] px-5 py-3 rounded-2xl shadow-sm ${isMe
                              ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-br-sm'
                              : 'bg-white text-slate-800 border border-slate-100 rounded-bl-sm'
                              }`}
                          >
                            <div className="text-[15px] leading-relaxed">{m.content}</div>
                            <div
                              className={`text-[10px] mt-1.5 text-right ${isMe ? 'text-indigo-100/80' : 'text-slate-400'
                                }`}
                            >
                              {new Date(m.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-100">
              <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                  <Smile size={24} />
                </button>
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 placeholder-slate-400"
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim()}
                  className={`p-2.5 rounded-xl transition-all ${inputMessage.trim()
                    ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 hover:scale-105 active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center animate-pulse">
                <Smile size={40} className="text-indigo-500" />
              </div>
            </div>
            <p className="text-xl font-medium text-slate-600">Select a chat to start messaging</p>
            <p className="text-sm mt-2 text-slate-400">Choose from your connection list</p>
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
