// src/pages/TravelsAsk.jsx
// AI-Travel — שאל את הטיולים שלך
// SUPER_ADMIN only (Erez)

import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BaronsHeader from './BaronsHeader'

// ============================================================================
// DESIGN TOKENS — light editorial, matches TripDetail
// ============================================================================
const TK = {
  bg: '#f8fafc',                  // light page background
  surface: '#ffffff',             // card / sidebar background
  surfaceAlt: '#f1f5f9',          // subtle alt surface (hover, sidebar)
  surfaceHover: '#e2e8f0',
  border: '#e2e8f0',              // light hairline
  borderStrong: '#cbd5e1',
  text: '#0f172a',                // ink — almost black
  textMuted: '#475569',           // body muted
  textDim: '#94a3b8',             // subtle
  accent: '#2563eb',              // blue accent (matches TripDetail)
  accentHover: '#1d4ed8',
  accentSoft: 'rgba(37,99,235,0.08)',
  userBubble: 'rgba(37,99,235,0.07)',
  userBorder: 'rgba(37,99,235,0.25)',
  font: 'Open Sans Hebrew, Open Sans, sans-serif',
  ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
}

// ============================================================================
// MARKDOWN-LITE RENDERER
// Handles [text](#/travels/UUID) → internal links
// Handles **bold** and line breaks
// ============================================================================
function renderMarkdown(text, navigate) {
  if (!text) return null
  // Split into paragraphs by double newline
  const paragraphs = text.split(/\n\n+/)
  return paragraphs.map((para, pIdx) => {
    // Within a paragraph, parse links and bold
    const parts = []
    let remaining = para
    let key = 0
    const linkRe = /\[([^\]]+)\]\(#\/travels\/([0-9a-f-]+)\)/i
    const boldRe = /\*\*([^*]+)\*\*/

    while (remaining.length > 0) {
      const linkMatch = remaining.match(linkRe)
      const boldMatch = remaining.match(boldRe)

      // Find which appears first
      let nextMatch = null
      let nextType = null
      if (linkMatch && boldMatch) {
        nextType = linkMatch.index < boldMatch.index ? 'link' : 'bold'
        nextMatch = nextType === 'link' ? linkMatch : boldMatch
      } else if (linkMatch) {
        nextType = 'link'
        nextMatch = linkMatch
      } else if (boldMatch) {
        nextType = 'bold'
        nextMatch = boldMatch
      }

      if (!nextMatch) {
        parts.push(<span key={key++}>{remaining}</span>)
        break
      }

      // Push pre-match text
      if (nextMatch.index > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, nextMatch.index)}</span>)
      }

      if (nextType === 'link') {
        const [whole, label, id] = nextMatch
        parts.push(
          <button
            key={key++}
            onClick={() => navigate(`/travels/${id}`)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: TK.accent,
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              fontWeight: 600,
            }}
          >{label}</button>
        )
        remaining = remaining.slice(nextMatch.index + whole.length)
      } else {
        const [whole, content] = nextMatch
        parts.push(<strong key={key++}>{content}</strong>)
        remaining = remaining.slice(nextMatch.index + whole.length)
      }
    }

    // Handle line breaks within a paragraph
    const withLineBreaks = []
    parts.forEach((part, i) => {
      if (typeof part?.props?.children === 'string' && part.props.children.includes('\n')) {
        const lines = part.props.children.split('\n')
        lines.forEach((line, j) => {
          if (j > 0) withLineBreaks.push(<br key={`br-${pIdx}-${i}-${j}`} />)
          withLineBreaks.push(<span key={`s-${pIdx}-${i}-${j}`}>{line}</span>)
        })
      } else {
        withLineBreaks.push(part)
      }
    })

    return (
      <p key={pIdx} style={{ margin: '0 0 12px 0', lineHeight: 1.65 }}>
        {withLineBreaks}
      </p>
    )
  })
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function TravelsAsk() {
  const navigate = useNavigate()
  const { chatId } = useParams() // /travels/ask/:chatId optional

  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [chats, setChats] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [editingMsgId, setEditingMsgId] = useState(null)
  const [editText, setEditText] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Auth check
  useEffect(() => {
    let alive = true
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!alive) return
      setUser(user)
      setAuthChecked(true)
      if (user?.email !== 'erez@barons.co.il') {
        navigate('/travels')
      }
    })
    return () => { alive = false }
  }, [navigate])

  // Load chat list
  async function loadChats() {
    const { data, error } = await supabase
      .from('travel_chats')
      .select('id, title, updated_at')
      .order('updated_at', { ascending: false })
    if (error) {
      console.error(error)
      return
    }
    setChats(data || [])
  }

  useEffect(() => {
    if (user?.email === 'erez@barons.co.il') {
      loadChats()
    }
  }, [user])

  // Load active chat messages
  useEffect(() => {
    if (!chatId) {
      setActiveChat(null)
      setMessages([])
      return
    }
    let alive = true
    ;(async () => {
      const { data: chatRow } = await supabase
        .from('travel_chats')
        .select('id, title')
        .eq('id', chatId)
        .single()
      if (!alive) return
      setActiveChat(chatRow)

      const { data: msgs } = await supabase
        .from('travel_chat_messages')
        .select('id, role, content, created_at, input_tokens, cached_tokens, output_tokens, cost_usd')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
      if (!alive) return
      setMessages(msgs || [])
    })()
    return () => { alive = false }
  }, [chatId])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  // Auto-resize textarea (respects min-height of 88px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const next = Math.min(Math.max(textareaRef.current.scrollHeight, 88), 240)
      textareaRef.current.style.height = next + 'px'
    }
  }, [input])

  // ---------------------------------------------------------
  // ACTIONS
  // ---------------------------------------------------------
  async function newChat() {
    navigate('/travels/ask')
  }

  async function deleteChat(id) {
    const ok = chats.find(c => c.id === id)
    if (!ok) return
    await supabase.from('travel_chats').delete().eq('id', id)
    if (chatId === id) navigate('/travels/ask')
    loadChats()
  }

  async function sendMessage(textOverride = null, replaceFromMsgId = null) {
    const userText = (textOverride ?? input).trim()
    if (!userText || sending) return

    setSending(true)
    setInput('')

    let currentChatId = chatId
    let currentMessages = messages

    // If editing, drop everything from that message onwards
    if (replaceFromMsgId) {
      const idx = messages.findIndex(m => m.id === replaceFromMsgId)
      if (idx >= 0) {
        // Delete those messages from DB
        const toDelete = messages.slice(idx).map(m => m.id)
        await supabase.from('travel_chat_messages').delete().in('id', toDelete)
        currentMessages = messages.slice(0, idx)
        setMessages(currentMessages)
      }
    }

    // Create chat if first message
    if (!currentChatId) {
      const title = userText.slice(0, 60)
      const { data: newChatRow, error } = await supabase
        .from('travel_chats')
        .insert({ title })
        .select()
        .single()
      if (error) {
        console.error(error)
        setSending(false)
        return
      }
      currentChatId = newChatRow.id
      navigate(`/travels/ask/${currentChatId}`, { replace: true })
    }

    // Insert user message
    const { data: userMsgRow } = await supabase
      .from('travel_chat_messages')
      .insert({
        chat_id: currentChatId,
        role: 'user',
        content: userText,
      })
      .select()
      .single()

    const newMsgs = [...currentMessages, userMsgRow]
    setMessages(newMsgs)

    // Send to edge function
    try {
      const messagesForApi = newMsgs.map(m => ({ role: m.role, content: m.content }))
      const { data: aiData, error: aiError } = await supabase.functions.invoke(
        'ask-travels',
        { body: { messages: messagesForApi } },
      )

      if (aiError) throw aiError
      if (!aiData?.reply) throw new Error('No reply from AI')

      // Save assistant message — include usage stats
      const u = aiData.usage || {}
      const { data: aiMsgRow } = await supabase
        .from('travel_chat_messages')
        .insert({
          chat_id: currentChatId,
          role: 'assistant',
          content: aiData.reply,
          input_tokens:  u.input_total  ?? null,
          cached_tokens: u.input_cached ?? null,
          output_tokens: u.output       ?? null,
          cost_usd:      u.cost_usd     ?? null,
        })
        .select()
        .single()

      setMessages(prev => [...prev, aiMsgRow])
    } catch (err) {
      console.error(err)
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: '⚠️ אופס, משהו השתבש. נסה שוב בעוד רגע.',
        created_at: new Date().toISOString(),
        isError: true,
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setSending(false)
      loadChats() // refresh sidebar order
    }
  }

  function startEdit(msg) {
    setEditingMsgId(msg.id)
    setEditText(msg.content)
  }

  async function saveEdit() {
    if (!editText.trim()) return
    const id = editingMsgId
    setEditingMsgId(null)
    await sendMessage(editText, id)
    setEditText('')
  }

  function cancelEdit() {
    setEditingMsgId(null)
    setEditText('')
  }

  function copyMessage(content, id) {
    // Strip markdown links: [label](url) → label
    const plain = content.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    navigator.clipboard.writeText(plain)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------
  if (!authChecked) {
    return <div style={{ background: TK.bg, minHeight: '100vh' }} />
  }

  if (user?.email !== 'erez@barons.co.il') {
    return null // navigated away
  }

  return (
    <div style={{
      background: TK.bg, minHeight: '100vh', color: TK.text,
      fontFamily: TK.font, direction: 'rtl',
    }}>
      <BaronsHeader />

      {/* Breadcrumbs */}
      <nav style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '13px', padding: '14px 24px',
        borderBottom: `1px solid ${TK.border}`,
        color: TK.textMuted,
      }}>
        <button onClick={() => navigate('/')} style={crumbBtn}>BARONS</button>
        <span>/</span>
        <button onClick={() => navigate('/travels')} style={crumbBtn}>נסיעות</button>
        <span>/</span>
        <span style={{ color: TK.text }}>AI-Travel</span>
      </nav>

      <div style={{
        display: 'flex', height: 'calc(100vh - 110px)',
        position: 'relative',
      }}>
        {/* Sidebar — chat list */}
        <aside style={{
          width: sidebarOpen ? '280px' : '0',
          minWidth: sidebarOpen ? '280px' : '0',
          background: TK.surfaceAlt,
          borderLeft: sidebarOpen ? `1px solid ${TK.border}` : 'none',
          overflow: 'hidden',
          transition: `width 250ms ${TK.ease}, min-width 250ms ${TK.ease}`,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '16px', borderBottom: `1px solid ${TK.border}` }}>
            <button onClick={newChat} style={{ ...primaryBtn, width: '100%' }}>+ צ'אט חדש</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {chats.length === 0 && (
              <div style={{ padding: '20px', color: TK.textDim, fontSize: '13px', textAlign: 'center' }}>
                אין צ'אטים עדיין
              </div>
            )}
            {chats.map(c => (
              <div key={c.id} style={{
                padding: '10px 12px', marginBottom: '4px',
                background: c.id === chatId ? TK.surfaceHover : 'transparent',
                border: `1px solid ${c.id === chatId ? TK.border : 'transparent'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                gap: '8px',
                transition: `background 150ms ${TK.ease}`,
              }}
              onMouseEnter={e => { if (c.id !== chatId) e.currentTarget.style.background = TK.surface }}
              onMouseLeave={e => { if (c.id !== chatId) e.currentTarget.style.background = 'transparent' }}
              onClick={() => navigate(`/travels/ask/${c.id}`)}
              >
                <div style={{
                  flex: 1, fontSize: '13px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{c.title}</div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (window.confirm('למחוק את הצ\'אט?')) deleteChat(c.id)
                  }}
                  style={{
                    background: 'transparent', border: 'none',
                    color: TK.textDim, cursor: 'pointer',
                    fontSize: '14px', padding: '2px 6px',
                  }}
                  title="מחק"
                >×</button>
              </div>
            ))}
          </div>
        </aside>

        {/* Main panel */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Top bar */}
          <div style={{
            padding: '12px 20px', borderBottom: `1px solid ${TK.border}`,
            display: 'flex', alignItems: 'center', gap: '12px',
            background: TK.surface,
          }}>
            <button
              type="button"
              onClick={() => setSidebarOpen(s => !s)}
              style={{
                background: 'transparent', border: `1px solid ${TK.border}`,
                color: TK.text, padding: '6px 12px', borderRadius: '6px',
                cursor: 'pointer', fontFamily: TK.font, fontSize: '13px',
              }}
            >{sidebarOpen ? 'הסתר רשימה' : 'הצג רשימה'}</button>
            <div style={{ flex: 1, fontSize: '14px', color: TK.textMuted }}>
              {activeChat?.title || 'AI-Travel · שאל על הטיולים שלך'}
            </div>
            {messages.some(m => m.cost_usd != null) && (() => {
              const total = messages.reduce((s, m) => s + (Number(m.cost_usd) || 0), 0)
              const totalIn = messages.reduce((s, m) => s + (Number(m.input_tokens) || 0), 0)
              const totalCached = messages.reduce((s, m) => s + (Number(m.cached_tokens) || 0), 0)
              const cachePct = totalIn > 0 ? Math.round((totalCached / totalIn) * 100) : 0
              return (
                <div
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '11px',
                    color: TK.textMuted,
                    direction: 'ltr',
                    background: TK.surfaceAlt,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: `1px solid ${TK.border}`,
                  }}
                  title={`Total this chat: $${total.toFixed(5)} · ${cachePct}% cached`}
                >
                  ${total.toFixed(4)}
                  {cachePct > 0 && (
                    <span style={{ color: '#10b981', marginInlineStart: '6px' }}>
                      {cachePct}% cached
                    </span>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '24px',
            maxWidth: '900px', margin: '0 auto', width: '100%',
          }}>
            {messages.length === 0 && !sending && (
              <div style={{
                color: TK.textDim, fontSize: '14px',
                padding: '60px 20px', textAlign: 'center', lineHeight: 1.7,
              }}>
                <div style={{ fontSize: '20px', color: TK.textMuted, marginBottom: '16px' }}>
                  שלום ארז, מה תרצה לדעת על הטיולים שלך?
                </div>
                <div style={{ marginTop: '24px', fontSize: '13px' }}>
                  לדוגמה:<br />
                  "מתי הייתי בבודפשט פעם אחרונה?"<br />
                  "איזה טיולים עשיתי עם רועי ירון?"<br />
                  "כמה טיסות עשיתי בשנתיים האחרונות?"
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} style={{
                marginBottom: '20px',
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-start' : 'flex-end',
              }}>
                <div style={{ maxWidth: '85%', minWidth: 0 }}>
                  {/* Bubble */}
                  <div style={{
                    padding: '12px 16px',
                    background: msg.role === 'user' ? TK.userBubble : TK.surface,
                    border: `1px solid ${msg.role === 'user' ? TK.userBorder : TK.border}`,
                    borderRadius: '12px',
                    fontSize: '14px',
                  }}>
                    {editingMsgId === msg.id ? (
                      <div>
                        <textarea
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          autoFocus
                          style={{
                            width: '100%', minHeight: '80px',
                            background: '#fff',
                            border: `1px solid ${TK.border}`,
                            borderRadius: '6px',
                            color: TK.text, padding: '8px',
                            fontFamily: TK.font, fontSize: '14px',
                            resize: 'vertical', direction: 'rtl',
                          }}
                        />
                        <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                          <button type="button" onClick={saveEdit} style={primaryBtn}>שלח מחדש</button>
                          <button type="button" onClick={cancelEdit} style={ghostBtn}>בטל</button>
                        </div>
                      </div>
                    ) : (
                      <>{renderMarkdown(msg.content, navigate)}</>
                    )}
                  </div>

                  {/* Action row */}
                  {editingMsgId !== msg.id && !msg.isError && (
                    <div style={{
                      display: 'flex', gap: '12px',
                      justifyContent: msg.role === 'user' ? 'flex-start' : 'flex-end',
                      alignItems: 'center',
                      marginTop: '6px',
                      fontSize: '11px',
                    }}>
                      {msg.role === 'assistant' && msg.cost_usd != null && (
                        <span
                          style={{
                            color: TK.textDim,
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '10.5px',
                            direction: 'ltr',
                          }}
                          title={
                            `Input: ${(msg.input_tokens ?? 0).toLocaleString()} tokens` +
                            ` (${(msg.cached_tokens ?? 0).toLocaleString()} cached)\n` +
                            `Output: ${(msg.output_tokens ?? 0).toLocaleString()} tokens\n` +
                            `Cost: $${Number(msg.cost_usd).toFixed(5)}`
                          }
                        >
                          ${Number(msg.cost_usd).toFixed(4)}
                          {msg.input_tokens > 0 && msg.cached_tokens > 0 && (
                            <span style={{ color: '#10b981', marginInlineStart: '4px' }}>
                              · {Math.round((msg.cached_tokens / msg.input_tokens) * 100)}% cached
                            </span>
                          )}
                        </span>
                      )}
                      {msg.role === 'assistant' && (
                        <button
                          type="button"
                          onClick={() => copyMessage(msg.content, msg.id)}
                          style={miniBtn}
                        >
                          {copiedId === msg.id ? '✓ הועתק' : 'העתק'}
                        </button>
                      )}
                      {msg.role === 'user' && (
                        <button
                          type="button"
                          onClick={() => startEdit(msg)}
                          style={miniBtn}
                        >ערוך</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {sending && (
              <div style={{
                display: 'flex', justifyContent: 'flex-end', marginBottom: '20px',
              }}>
                <div style={{
                  padding: '12px 16px',
                  background: TK.surface,
                  border: `1px solid ${TK.border}`,
                  borderRadius: '12px',
                  color: TK.textMuted, fontSize: '13px',
                }}>
                  חושב…
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div style={{
            padding: '20px', borderTop: `1px solid ${TK.border}`,
            background: TK.surface,
          }}>
            <div style={{
              maxWidth: '900px', margin: '0 auto',
              display: 'flex', gap: '10px', alignItems: 'stretch',
            }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = TK.accent
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${TK.accentSoft}`
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = TK.borderStrong
                  e.currentTarget.style.boxShadow = 'none'
                }}
                placeholder="שאל משהו על הטיולים שלך…"
                disabled={sending}
                rows={3}
                style={{
                  flex: 1,
                  minHeight: '88px',
                  background: '#fff',
                  border: `1px solid ${TK.borderStrong}`,
                  borderRadius: '12px',
                  color: TK.text,
                  padding: '14px 16px',
                  fontFamily: TK.font, fontSize: '15px',
                  resize: 'none', direction: 'rtl',
                  outline: 'none',
                  lineHeight: 1.55,
                  transition: `border-color 150ms ${TK.ease}, box-shadow 150ms ${TK.ease}`,
                }}
              />
              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={sending || !input.trim()}
                style={{
                  ...primaryBtn,
                  padding: '0 22px',
                  alignSelf: 'stretch',
                  minHeight: '88px',
                  opacity: (sending || !input.trim()) ? 0.4 : 1,
                  cursor: (sending || !input.trim()) ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >שלח</button>
            </div>
            <div style={{
              maxWidth: '900px', margin: '10px auto 0',
              fontSize: '11px', color: TK.textDim, textAlign: 'center',
            }}>
              Enter לשליחה · Shift+Enter לשורה חדשה
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// ============================================================================
// SHARED STYLES
// ============================================================================
const crumbBtn = {
  background: 'transparent', border: 'none',
  color: TK.textMuted, cursor: 'pointer',
  fontFamily: TK.font, fontSize: '13px', padding: 0,
}

const primaryBtn = {
  background: TK.accent, color: '#fff',
  border: 'none', borderRadius: '8px',
  padding: '10px 16px',
  fontFamily: TK.font, fontSize: '14px', fontWeight: 600,
  cursor: 'pointer',
  transition: `background 150ms ${TK.ease}`,
}

const ghostBtn = {
  background: 'transparent', color: TK.textMuted,
  border: `1px solid ${TK.border}`, borderRadius: '8px',
  padding: '10px 16px',
  fontFamily: TK.font, fontSize: '14px',
  cursor: 'pointer',
}

const miniBtn = {
  background: 'transparent',
  border: 'none',
  color: TK.textDim,
  cursor: 'pointer',
  fontFamily: TK.font,
  fontSize: '11px',
  padding: '2px 6px',
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
}
