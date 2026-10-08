"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { sendChatMessageAction, markChatRoomReadAction } from "../actions/chat";
import type { ChatMessage } from "../../lib/chat";

export function ChatBox({
  roomId,
  initialMessages,
  currentUserId,
  partnerName,
  partnerRoleTitle,
  partnerSubtitle,
  bookingCode,
  returnUrl,
}: {
  roomId: string;
  initialMessages: ChatMessage[];
  currentUserId: string;
  partnerName: string;
  partnerRoleTitle: string;
  partnerSubtitle: string;
  bookingCode?: string;
  returnUrl?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputMessage, setInputMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync initial messages when roomId changes
  useEffect(() => {
    setMessages(initialMessages);
  }, [roomId, initialMessages]);

  // Scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark room messages as read on mount / change
  useEffect(() => {
    const formData = new FormData();
    formData.set("room_id", roomId);
    markChatRoomReadAction(formData).catch(() => {});
  }, [roomId]);

  // Supabase Realtime subscription specifically scoped to room_id
  useEffect(() => {
    const supabase = createClient();
    const channelName = `chat_room_${roomId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;

          // If sender details not populated by realtime payload, fetch sender profile
          if (!newMsg.sender) {
            const { data: senderProfile } = await supabase
              .from("profiles")
              .select("name, role")
              .eq("id", newMsg.sender_id)
              .maybeSingle();

            newMsg.sender = senderProfile ?? { name: "Pengguna", role: "customer" };
          }

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Mark as read if received from others
          if (newMsg.sender_id !== currentUserId) {
            const formData = new FormData();
            formData.set("room_id", roomId);
            markChatRoomReadAction(formData).catch(() => {});
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, currentUserId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = inputMessage.trim();
    if (!text || isSubmitting) return;

    setIsSubmitting(true);
    setInputMessage("");

    // Optimistic message append
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      room_id: roomId,
      sender_id: currentUserId,
      message: text,
      is_read: false,
      created_at: new Date().toISOString(),
      sender: { name: "Anda", role: "customer" },
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const formData = new FormData();
    formData.set("room_id", roomId);
    formData.set("message", text);
    if (returnUrl) formData.set("return_url", returnUrl);

    try {
      await sendChatMessageAction(formData);
    } catch {
      // Revert if error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputMessage(text);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
      {/* Header */}
      <div className="p-4 bg-slate-50 border-b border-gray-200 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900">{partnerName}</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
              {partnerRoleTitle}
            </span>
            {bookingCode && (
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                {bookingCode}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{partnerSubtitle}</p>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fbfdfc] min-h-[22rem] max-h-[30rem]">
        {messages.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <span className="text-4xl block mb-2">💬</span>
            <p className="text-sm font-medium">Belum ada pesan di percakapan ini.</p>
            <p className="text-xs mt-1">Kirim pesan pembuka di bawah ini untuk memulai obrolan.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            const senderRole = msg.sender?.role;
            const roleBadge =
              senderRole === "admin"
                ? "Admin"
                : senderRole === "staff"
                ? "Petugas"
                : isMe
                ? "Anda"
                : "Pelanggan";

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-xs ${
                    isMe
                      ? "bg-teal-700 text-white rounded-br-xs"
                      : "bg-white text-gray-900 border border-gray-200 rounded-bl-xs"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span
                      className={`font-bold text-[10px] uppercase tracking-wider ${
                        isMe ? "text-teal-200" : "text-gray-500"
                      }`}
                    >
                      {isMe ? "Anda" : msg.sender?.name || roleBadge} ({roleBadge})
                    </span>
                    <span
                      className={`text-[9px] ${
                        isMe ? "text-teal-200" : "text-gray-400"
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed text-[13px]">{msg.message}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-200 flex gap-2">
        <input
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={`Tulis pesan untuk ${partnerName}...`}
          maxLength={2000}
          required
          disabled={isSubmitting}
          className="flex-1 text-xs sm:text-sm border border-gray-300 rounded-lg px-3.5 py-2.5 focus:outline-teal-600 focus:border-teal-600 disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={isSubmitting || !inputMessage.trim()}
          className="customer-button customer-button-primary px-5 py-2 text-xs sm:text-sm font-semibold rounded-lg disabled:opacity-50"
        >
          {isSubmitting ? "Mengirim..." : "Kirim"}
        </button>
      </form>
    </div>
  );
}
