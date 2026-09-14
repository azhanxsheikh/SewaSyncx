import { useState, useRef, useEffect } from "react"
import type { Screen } from "../../types/navigation"
import { quickReplies } from "../../fixtures/content.fixture"
import { useTechnicianProfile } from "../../hooks/useTechnicians"
import { useDispatch } from "../../context/DispatchContext"

interface Props {
  navigate: (s: Screen) => void
  onBack: () => void
}

export default function Chat({ navigate, onBack }: Props) {
  const { job } = useDispatch()
  const techProfile = useTechnicianProfile(job?.technicianId)
  const techName = job?.technicianName || techProfile?.name || "Kevin"
  const techPhoto =
    job?.technicianPhoto ||
    techProfile?.photo ||
    "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150"
  const serviceName =
    job?.technicianCategory ||
    (job?.service
      ? job.service.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "AC Repair")

  const [messages, setMessages] = useState([
    {
      id: "m1",
      sender: "system" as const,
      text: `You are now connected with ${techName}.`,
      time: "Just now",
    },
    {
      id: "m2",
      sender: "user" as const,
      text: `Hi ${techName}, I'm at the address waiting for ${serviceName.toLowerCase()} service.`,
      time: "Just now",
    },
    {
      id: "m3",
      sender: "tech" as const,
      text: `Hello! I'm on my way. Arriving soon.`,
      time: "Just now",
    },
  ])
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = (text: string) => {
    if (!text.trim()) return
    const newMsg = {
      id: `m${Date.now()}`,
      sender: "user" as const,
      text,
      time: new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }
    setMessages((prev) => [...prev, newMsg])
    setInput("")

    // Simulate tech reply
    setTimeout(() => {
      const reply = {
        id: `r${Date.now()}`,
        sender: "tech" as const,
        text: "Got it! I'll be there soon.",
        time: new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }
      setMessages((prev) => [...prev, reply])
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-md mx-auto flex items-center px-4 py-3 gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <img
            src={techPhoto}
            alt={techName}
            className="w-9 h-9 rounded-full object-cover"
          />
          <div className="flex-1">
            <p className="font-display font-700 text-gray-900 text-sm">
              {techName}
            </p>
            <p className="text-xs text-emerald-500 font-500">
              ● Online · {serviceName}
            </p>
          </div>
          <button className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors">
            <svg
              className="w-5 h-5 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </button>
          <button
            onClick={() => navigate("sos-tracking")}
            className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
            </svg>
          </button>
        </div>

        {/* ETA bar */}
        <div className="max-w-md mx-auto px-4 pb-2.5">
          <div className="bg-blue-50 rounded-xl px-3 py-2 flex items-center justify-between">
            <p className="text-xs text-blue-700 font-500">
              🛵 {techName} is 5 minutes away
            </p>
            <button
              onClick={() => navigate("sos-tracking")}
              className="text-blue-600 text-xs font-600 hover:underline"
            >
              Track
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-32 max-w-md mx-auto w-full scrollbar-hide">
        {messages.map((msg) => {
          if (msg.sender === "system") {
            return (
              <div key={msg.id} className="text-center">
                <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
                  {msg.text}
                </span>
              </div>
            )
          }

          const isUser = msg.sender === "user"
          return (
            <div
              key={msg.id}
              className={`flex ${
                isUser ? "justify-end" : "justify-start"
              } gap-2`}
            >
              {!isUser && (
                <img
                  src={techPhoto}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover flex-shrink-0 self-end"
                />
              )}
              <div className={`max-w-[75%]`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-900 rounded-bl-sm"
                  }`}
                >
                  {msg.text}
                </div>
                <p
                  className={`text-[10px] text-gray-400 mt-1 ${
                    isUser ? "text-right" : "text-left"
                  }`}
                >
                  {msg.time}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      <div className="fixed bottom-16 left-0 right-0 px-4 pb-2 max-w-md mx-auto">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {quickReplies.map((r) => (
            <button
              key={r}
              onClick={() => sendMessage(r)}
              className="flex-shrink-0 bg-white border border-gray-200 text-gray-700 text-xs px-3 py-2 rounded-full hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3">
        <div className="max-w-md mx-auto flex gap-2">
          <button className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors text-gray-400">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
          />
          <button
            onClick={() => sendMessage(input)}
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
