import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, ChevronDown, Send, Search } from 'lucide-react';
import { sendMessage, getConversations, getConversation, getUnreadCount } from './messageApi';

/* ── Avatar helper ─────────────────────────────────────────────────────── */
function Avatar({ user, size = 36 }) {
  const initials = [user?.firstname?.[0], user?.lastname?.[0]]
    .filter(Boolean).join('').toUpperCase() || '?';
  return user?.photo ? (
    <img
      src={user.photo}
      alt={user.firstname}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
    />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontWeight: 700, fontSize: Math.max(11, size / 3),
      fontFamily: 'Syne, sans-serif',
    }}>
      {initials}
    </div>
  );
}

/* ── Single chat window ─────────────────────────────────────────────────── */
function ChatWindow({ conversation, currentUser, onClose, onMinimize, isMinimized, stackIndex }) {
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState('');
  const [sending,     setSending]     = useState(false);
  const [loading,     setLoading]     = useState(true);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const pollRef    = useRef(null);

  const otherUser = conversation.otherUser;

  const fetchMessages = useCallback(async () => {
    try {
      const data = await getConversation(otherUser.id);
      setMessages(data.messages || []);
    } catch (err) {
      console.warn('[ChatWindow] fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [otherUser.id]);

  useEffect(() => {
    // Clear any previous poll before starting a new one
    if (pollRef.current) clearInterval(pollRef.current);
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchMessages]);

  useEffect(() => {
    if (!isMinimized) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, isMinimized]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    try {
      await sendMessage(otherUser.id, text);
      // Refresh the full conversation to stay in sync with backend
      await fetchMessages();
    } catch (err) {
      console.error('[ChatWindow] send error:', err);
      setInput(text); // restore on failure
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Stack windows side by side from the right
  const rightOffset = 80 + stackIndex * 340;

  return (
    <>
      <style>{`
        .chat-messages::-webkit-scrollbar {
          width: 4px;
        }
        .chat-messages::-webkit-scrollbar-track {
          background: transparent;
        }
        .chat-messages::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 999px;
        }
        .chat-messages::-webkit-scrollbar-thumb:hover {
          background: #666;
        }
      `}</style>
      <div style={{
        position: 'fixed',
        bottom: 0,
        right: rightOffset,
        width: 320,
      maxHeight: 580,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      borderRadius: isMinimized ? '12px 12px 0 0' : '12px 12px 0 0',
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderBottom: 'none',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      {/* Header */}
      <div
        onClick={onMinimize}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px',
          background: '#1a1a2e',
          cursor: 'pointer',
          borderBottom: isMinimized ? 'none' : '1px solid rgba(255,255,255,0.07)',
          userSelect: 'none',
        }}
      >
        <Avatar user={otherUser} size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#f0eeff', fontWeight: 700, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {otherUser.firstname} {otherUser.lastname}
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onMinimize(); }}
          style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 2 }}
        >
          <ChevronDown size={16} style={{ transform: isMinimized ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 2 }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      {!isMinimized && (
        <>
          <div
            className="chat-messages"
            style={{
              overflowY: 'auto', padding: '14px',
              background: '#0f0f1a',
              height: 500,
              maxHeight: 500,
              display: 'flex', flexDirection: 'column', gap: 8,
              overflowAnchor: 'none',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'auto',
            }}>
            {loading ? (
              <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 12, marginTop: 40 }}>Loading…</div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 12, marginTop: 40 }}>
                No messages yet. Say hi! 👋
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.senderId === currentUser?.id;
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: isMine ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div style={{
                      maxWidth: '75%',
                      padding: '8px 12px',
                      borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isMine
                        ? 'linear-gradient(135deg, #A855F7, #EC4899)'
                        : 'rgba(255,255,255,0.07)',
                      color: isMine ? 'white' : '#e5e7eb',
                      fontSize: 13,
                      lineHeight: 1.45,
                      wordBreak: 'break-word',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px',
            background: '#13131f',
            borderTop: '1px solid rgba(255,255,255,0.07)',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              rows={1}
              style={{
                flex: 1, resize: 'none', border: 'none', outline: 'none',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 8, padding: '7px 10px',
                color: '#e5e7eb', fontSize: 13,
                fontFamily: 'DM Sans, sans-serif',
                lineHeight: 1.4, maxHeight: 80, overflowY: 'auto',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                background: input.trim() ? 'linear-gradient(135deg, #A855F7, #EC4899)' : 'rgba(255,255,255,0.08)',
                color: 'white', cursor: input.trim() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.15s',
              }}
            >
              <Send size={14} />
            </button>
          </div>
        </>
      )}
      </div>
    </>
  );
}

/* ── Conversations list panel ───────────────────────────────────────────── */
function ConversationsPanel({ currentUser, onOpenChat, onClose }) {
  const [conversations, setConversations] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');

  useEffect(() => {
    getConversations()
      .then(data => setConversations(data || []))
      .catch(err => console.warn('[ConversationsPanel]', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = conversations.filter(c => {
    const name = `${c.otherUser.firstname} ${c.otherUser.lastname}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const formatTime = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{
      position: 'fixed', bottom: 72, right: 20,
      width: 320, maxHeight: 480,
      background: '#13131f',
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      zIndex: 999,
      fontFamily: 'DM Sans, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 16px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <p style={{ color: '#f0eeff', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, margin: 0 }}>
          Messages
        </p>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 4 }}>
          <X size={18} />
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations…"
            style={{
              width: '100%', padding: '7px 10px 7px 30px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, color: '#e5e7eb',
              fontSize: 13, outline: 'none',
              fontFamily: 'DM Sans, sans-serif',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
            {search ? 'No results' : 'No conversations yet'}
          </div>
        ) : (
          filtered.map((conv, i) => (
            <button
              key={i}
              onClick={() => { onOpenChat(conv); onClose(); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', border: 'none', background: 'none',
                cursor: 'pointer', textAlign: 'left',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <div style={{ position: 'relative' }}>
                <Avatar user={conv.otherUser} size={40} />
                {conv.unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -3, right: -3,
                    width: 16, height: 16, borderRadius: '50%',
                    background: '#ef4444', color: 'white',
                    fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid #13131f',
                  }}>
                    {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <p style={{ color: '#e5e7eb', fontWeight: conv.unreadCount > 0 ? 700 : 500, fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.otherUser.firstname} {conv.otherUser.lastname}
                  </p>
                  <span style={{ color: '#6b7280', fontSize: 11, flexShrink: 0, marginLeft: 8 }}>
                    {formatTime(conv.lastMessage?.sentAt)}
                  </span>
                </div>
                <p style={{
                  color: conv.unreadCount > 0 ? '#d1d5db' : '#6b7280',
                  fontSize: 12, margin: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontWeight: conv.unreadCount > 0 ? 600 : 400,
                }}>
                  {conv.lastMessage?.senderId === currentUser?.id ? 'You: ' : ''}
                  {conv.lastMessage?.content}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Main ChatWidget export ─────────────────────────────────────────────── */
export default function ChatWidget({ currentUser, openChatWith, onChatOpened }) {
  const [showPanel,     setShowPanel]     = useState(false);
  const [openChats,     setOpenChats]     = useState([]); // [{ otherUser, ... }]
  const [minimized,     setMinimized]     = useState({}); // { userId: bool }
  const [unreadTotal,   setUnreadTotal]   = useState(0);
  const pollRef = useRef(null);

  // Define openChat callback first so it can be used in useEffect
 const openChat = useCallback((conversation) => {
  const uid = conversation.otherUser?.id;
  if (!uid) return;

  // Always un-minimize regardless of whether chat exists or is new
  setMinimized(m => ({ ...m, [uid]: false }));

  setOpenChats(prev => {
    const exists = prev.find(c => c.otherUser?.id === uid);
    if (exists) {
      // Already open — return same array reference so no re-render
      return prev;
    }
    // Cap at 3 windows max
    const capped = prev.length >= 3 ? prev.slice(1) : prev;
    return [...capped, { otherUser: { ...conversation.otherUser, id: uid } }];
  });
}, []);

  // Poll unread count
  useEffect(() => {
    if (!currentUser?.id) return;
    const fetchUnread = async () => {
      try {
        const data = await getUnreadCount();
        setUnreadTotal(data.unreadCount || 0);
      } catch (_) {}
    };
    fetchUnread();
    pollRef.current = setInterval(fetchUnread, 8000);
    return () => clearInterval(pollRef.current);
  }, [currentUser?.id]);

  // External trigger: open a chat with someone
  useEffect(() => {
    if (!openChatWith) return;
    openChat({ otherUser: openChatWith });
    // Signal that the chat has been opened so App can reset openChatWith
    onChatOpened?.();
  }, [openChatWith, openChat, onChatOpened]);

  const closeChat = useCallback((userId) => {
    setOpenChats(prev => prev.filter(c => c.otherUser.id !== userId));
    setMinimized(m => { const n = { ...m }; delete n[userId]; return n; });
  }, []);

  const toggleMinimize = useCallback((userId) => {
    setMinimized(m => ({ ...m, [userId]: !m[userId] }));
  }, []);

  if (!currentUser?.id) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setShowPanel(v => !v)}
        style={{
          position: 'fixed', bottom: 20, right: 20,
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg, #A855F7, #EC4899)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(168,85,247,0.5)',
          zIndex: 998,
          transition: 'transform 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <MessageCircle size={22} color="white" />
        {unreadTotal > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            minWidth: 18, height: 18, borderRadius: 9,
            background: '#ef4444', color: 'white',
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid #0a0a12',
          }}>
            {unreadTotal > 99 ? '99+' : unreadTotal}
          </span>
        )}
      </button>

      {/* Conversations panel */}
      {showPanel && (
        <ConversationsPanel
          currentUser={currentUser}
          onOpenChat={openChat}
          onClose={() => setShowPanel(false)}
        />
      )}

      {/* Open chat windows */}
      {openChats.map((conv, idx) => (
        <ChatWindow
          key={conv.otherUser.id}
          conversation={conv}
          currentUser={currentUser}
          stackIndex={idx}
          isMinimized={!!minimized[conv.otherUser.id]}
          onClose={() => closeChat(conv.otherUser.id)}
          onMinimize={() => toggleMinimize(conv.otherUser.id)}
        />
      ))}
    </>
  );
}
