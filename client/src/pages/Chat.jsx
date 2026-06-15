import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Send, Image, Mic, Square, MessageSquare, Phone, User, CheckCheck, Loader2 } from 'lucide-react';

const Chat = () => {
  const { user, token } = useSelector((state) => state.auth);

  // Chat contacts list
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [contactsLoading, setContactsLoading] = useState(true);

  // Messages
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [roomId, setRoomId] = useState('');

  // Socket
  const socketRef = useRef(null);
  const messageEndRef = useRef(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);

  // Fetch Contacts
  useEffect(() => {
    if (token) {
      setContactsLoading(true);
      axios.get('/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        if (res.data.success) {
          setContacts(res.data.users);
          if (res.data.users.length > 0) {
            setActiveContact(res.data.users[0]);
          }
        }
      })
      .catch(err => console.error(err))
      .finally(() => setContactsLoading(false));
    }
  }, [token]);

  // Connect Socket.io client
  useEffect(() => {
    socketRef.current = io(window.location.origin || 'http://localhost:5000');

    socketRef.current.on('connect', () => {
      console.log('Chat socket connected.');
    });

    socketRef.current.on('recv_msg', (data) => {
      // If message is for current room, append it
      if (data.roomId === roomId) {
        setMessages(prev => [...prev, data]);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId]);

  // Load Room History and join room
  useEffect(() => {
    if (activeContact && user) {
      setMessagesLoading(true);
      const sortedIds = [user._id.toString(), activeContact._id.toString()].sort().join('_');
      setRoomId(sortedIds);

      // Join socket room
      if (socketRef.current) {
        socketRef.current.emit('join_room', sortedIds);
      }

      // Fetch history
      axios.get(`/api/chat/${activeContact._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        if (res.data.success) {
          setMessages(res.data.messages);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setMessagesLoading(false));
    }
  }, [activeContact, user, token]);

  // Auto-scroll messages
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Send message
  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || !activeContact || !user) return;

    const payload = {
      roomId,
      sender: user._id,
      receiver: activeContact._id,
      message: messageText,
      image: '',
      voiceNote: ''
    };

    if (socketRef.current) {
      socketRef.current.emit('send_msg', payload);
    }
    setMessageText('');
  };

  // Start HTML5 MediaRecorder Audio Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result;
          
          // Send voice note message payload
          const payload = {
            roomId,
            sender: user._id,
            receiver: activeContact._id,
            message: 'Voice Note (Recorded)',
            image: '',
            voiceNote: base64Audio
          };

          if (socketRef.current) {
            socketRef.current.emit('send_msg', payload);
          }
        };
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      alert('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      // Close microphone stream tracks to release device lock
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  };

  const simulateImageSend = () => {
    // Premium custom image attachment mockup
    const dummyImages = [
      'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&q=80&w=300',
      'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=300'
    ];
    const imagePayload = {
      roomId,
      sender: user._id,
      receiver: activeContact._id,
      message: 'Attached Spec Image',
      image: dummyImages[Math.floor(Math.random() * dummyImages.length)],
      voiceNote: ''
    };

    if (socketRef.current) {
      socketRef.current.emit('send_msg', imagePayload);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Direct Chat</h1>
        <p className="text-slate-400 text-xs mt-1">Real-time collaboration between Farmers, Tool Owners, and Shopkeepers.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 glass rounded-3xl border border-slate-800 overflow-hidden h-[580px]">
        
        {/* Left column: Contacts list */}
        <div className="border-r border-slate-800 flex flex-col h-full bg-slate-900/10">
          <div className="p-4 border-b border-slate-800 bg-slate-950/20">
            <p className="text-xs font-bold text-white uppercase tracking-wider">Direct Contacts</p>
          </div>
          
          <div className="flex-grow overflow-y-auto divide-y divide-slate-800 scrollbar-hidden">
            {contactsLoading ? (
              <div className="p-8 text-center text-slate-500 text-xs">Loading contacts...</div>
            ) : contacts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">No active contacts on platform.</div>
            ) : (
              contacts.map(c => (
                <button
                  key={c._id}
                  onClick={() => setActiveContact(c)}
                  className={`w-full text-left p-4 hover:bg-slate-900/30 transition-colors flex items-center gap-3 ${
                    activeContact?._id === c._id ? 'bg-emerald-500/5' : ''
                  }`}
                >
                  <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs">
                    {c.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-white">{c.name}</p>
                    <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">{c.role}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right column: Chat box */}
        <div className="md:col-span-2 flex flex-col justify-between h-full bg-slate-950/10">
          {activeContact ? (
            <>
              {/* Active Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-950/20 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs">
                    {activeContact.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{activeContact.name}</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{activeContact.role}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button className="p-2 bg-slate-900 border border-slate-850 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors" title="Voice Call">
                    <Phone size={14} />
                  </button>
                </div>
              </div>

              {/* Chat Body */}
              <div className="flex-grow p-6 overflow-y-auto space-y-4 scrollbar-hidden">
                {messagesLoading ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                    <Loader2 className="animate-spin text-emerald-500 mr-2" size={16} /> Loading messages history...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                    No conversation history. Send a message to start direct-to-farm communication!
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isOwn = msg.sender?._id?.toString() === user._id.toString() || msg.sender === user._id;
                    return (
                      <div key={index} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs sm:max-w-md rounded-2xl p-4 text-xs leading-relaxed ${
                          isOwn
                            ? 'bg-emerald-600 text-white rounded-tr-none shadow-md'
                            : 'bg-slate-900 border border-slate-850 text-slate-350 rounded-tl-none'
                        }`}>
                          <p className={`text-[8px] font-bold uppercase tracking-wider mb-1 ${
                            isOwn ? 'text-emerald-100' : 'text-emerald-400'
                          }`}>
                            {isOwn ? 'You' : msg.sender?.name || activeContact.name}
                          </p>
                          
                          {msg.voiceNote ? (
                            <div className="flex items-center gap-2">
                              <span className="text-base shrink-0">🎙️</span>
                              {/* Voice Wave Animation */}
                              <div className="flex gap-0.5 items-center shrink-0">
                                <span className="h-4 w-1 bg-white rounded-full"></span>
                                <span className="h-5 w-1 bg-white rounded-full"></span>
                                <span className="h-3 w-1 bg-white rounded-full"></span>
                              </div>
                              <audio controls src={msg.voiceNote} className="max-w-[150px] sm:max-w-[200px] h-8 text-[10px]"></audio>
                            </div>
                          ) : msg.image ? (
                            <div className="space-y-2">
                              <img src={msg.image} alt="Attachment" className="max-h-48 w-full object-cover rounded-xl border border-slate-800" />
                              <p>{msg.message}</p>
                            </div>
                          ) : (
                            <p>{msg.message}</p>
                          )}
                          
                          <div className="flex items-center justify-end gap-1.5 mt-1.5 opacity-60 text-[8px] font-semibold">
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isOwn && <CheckCheck size={10} />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messageEndRef}></div>
              </div>

              {/* Chat Input controls footer */}
              <div className="p-4 bg-slate-950/20 border-t border-slate-850 flex gap-2 items-center shrink-0">
                {/* Voice Note trigger */}
                {isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-md shrink-0 flex items-center gap-1.5 text-xs font-bold animate-pulse"
                  >
                    <Square size={16} /> Stop Rec
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="p-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors shrink-0"
                    title="Record Voice Note"
                  >
                    <Mic size={16} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={simulateImageSend}
                  className="p-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors shrink-0"
                  title="Attach Spec Image"
                >
                  <Image size={16} />
                </button>

                <form onSubmit={handleSendMessage} className="flex-grow flex gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type details or discuss pricing details..."
                    className="flex-grow bg-slate-950 border border-slate-850 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder-slate-650"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 text-white p-3.5 rounded-xl text-xs font-bold transition-all shadow-md shrink-0"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              <MessageSquare size={32} className="text-slate-700 block mb-2 mx-auto" />
              Select a contact to begin direct-to-farm communication.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Chat;
