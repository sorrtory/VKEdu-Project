'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useChat, useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import type { ReceivedChatMessage } from '@livekit/components-react';

interface AgentMessage {
  text: string;
  timestamp: number;
  isFromUser: boolean;
  id: string;
}

export default function CustomChat() {
  const { chatMessages, send } = useChat();
  const room = useRoomContext();
  const [activeTab, setActiveTab] = useState<'general' | 'agent'>('general');
  const [inputValue, setInputValue] = useState('');
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const agentMessagesRef = useRef<Set<string>>(new Set());
  
  const agentIdentity = process.env.NEXT_PUBLIC_LIVEKIT_AGENT_NAME;

  // General chat: all messages except direct agent responses
  const generalMessages = chatMessages.filter((msg) => {
    const isAgentResponse = msg.from?.identity === agentIdentity && msg.destinationIdentities && msg.destinationIdentities.length > 0;
    return !isAgentResponse;
  });

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    if (activeTab === 'general') {
      await send(inputValue);
    } else {
      // Send to agent with destinationIdentities
      if (!agentIdentity) return;

      const messageId = `${Date.now()}-${Math.random()}`;
      await send(inputValue, { destinationIdentities: [agentIdentity] });
      
      setAgentMessages(prev => [...prev, {
        text: inputValue,
        timestamp: Date.now(),
        isFromUser: true,
        id: messageId,
      }]);
      agentMessagesRef.current.add(messageId);
    }
    setInputValue('');
  };

  // Listen for agent responses on the agent-response data channel
  useEffect(() => {
    if (!room) return;

    const onDataReceived = (payload: Uint8Array) => {
      try {
        const decoded = new TextDecoder().decode(payload);
        const data = JSON.parse(decoded);

        if (data.from_agent && data.message) {
          const messageId = data.id || `agent-${data.timestamp}`;
          
          if (!agentMessagesRef.current.has(messageId)) {
            setAgentMessages(prev => [...prev, {
              text: data.message,
              timestamp: data.timestamp || Date.now(),
              isFromUser: false,
              id: messageId,
            }]);
            agentMessagesRef.current.add(messageId);
          }
        }
      } catch (error) {
        console.error('Failed to parse agent response:', error);
      }
    };

    // Note: In real scenario, we would filter by topic, but LiveKit's data channel 
    // broadcasts all messages. Agent responses come with from_agent flag.
    room.on(RoomEvent.DataReceived, onDataReceived);

    return () => {
      room.off(RoomEvent.DataReceived, onDataReceived);
    };
  }, [room]);

  // Also listen to regular chat messages that are responses to agent
  useEffect(() => {
    const agentResponses = chatMessages.filter(msg => 
      msg.from?.identity === agentIdentity && 
      msg.destinationIdentities && 
      msg.destinationIdentities.length > 0
    );
    
    agentResponses.forEach(msg => {
      const msgId = `${msg.from?.identity}-${msg.timestamp}`;
      if (!agentMessagesRef.current.has(msgId)) {
        setAgentMessages(prev => [...prev, {
          text: msg.message,
          timestamp: msg.timestamp,
          isFromUser: false,
          id: msgId,
        }]);
        agentMessagesRef.current.add(msgId);
      }
    });
  }, [chatMessages, agentIdentity]);

  const getCurrentMessages = (): (ReceivedChatMessage | AgentMessage)[] => {
    if (activeTab === 'general') {
      return generalMessages;
    } else {
      return agentMessages;
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' });
  };

  const isReceivedChatMessage = (msg: ReceivedChatMessage | AgentMessage): msg is ReceivedChatMessage => {
    return 'from' in msg;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0b1220' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <button
          onClick={() => setActiveTab('general')}
          style={{
            flex: 1,
            padding: '12px',
            background: activeTab === 'general' ? '#1e293b' : 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontWeight: activeTab === 'general' ? 'bold' : 'normal'
          }}
        >
          Общий чат ({generalMessages.length})
        </button>
        <button
          onClick={() => setActiveTab('agent')}
          style={{
            flex: 1,
            padding: '12px',
            background: activeTab === 'agent' ? '#1e293b' : 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontWeight: activeTab === 'agent' ? 'bold' : 'normal'
          }}
        >
          AI Агент ({agentMessages.length})
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {getCurrentMessages().map((msg, idx) => {
          const isUserMessage = isReceivedChatMessage(msg) 
            ? msg.from?.identity !== agentIdentity && (!msg.destinationIdentities || msg.destinationIdentities.length === 0)
            : msg.isFromUser;
          
          const messageText = isReceivedChatMessage(msg) ? msg.message : msg.text;
          const timestamp = msg.timestamp;
          const senderName = isReceivedChatMessage(msg) ? msg.from?.identity : (msg.isFromUser ? 'Вы' : 'Агент');
          
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: isUserMessage ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  background: isUserMessage ? '#3b82f6' : '#1e293b',
                  color: 'white',
                }}
              >
                <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                  {senderName !== 'Вы' && senderName !== 'Агент' && `${senderName}: `}
                  {senderName === 'Агент' && 'AI Агент: '}
                  {isUserMessage && 'Вы: '}
                </div>
                <div>{messageText}</div>
                <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px' }}>
                  {formatTime(timestamp)}
                </div>
              </div>
            </div>
          );
        })}
        
        {getCurrentMessages().length === 0 && activeTab === 'agent' && (
          <div style={{ 
            textAlign: 'center', 
            color: 'rgba(255,255,255,0.5)', 
            padding: '20px',
            fontSize: '14px'
          }}>
            Напишите сообщение AI агенту
          </div>
        )}
        
        {getCurrentMessages().length === 0 && activeTab === 'general' && (
          <div style={{ 
            textAlign: 'center', 
            color: 'rgba(255,255,255,0.5)', 
            padding: '20px',
            fontSize: '14px'
          }}>
            Нет сообщений
          </div>
        )}
      </div>

      <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={activeTab === 'general' ? "Сообщение всем..." : "Сообщение AI агенту..."}
            style={{
              flex: 1,
              minWidth: 0,
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: '#1e293b',
              color: 'white',
              outline: 'none'
            }}
          />
          <button
            onClick={handleSendMessage}
            style={{
              flexShrink: 0,
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#3b82f6',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Отправить
          </button>
        </div>
      </div>
    </div>
  );
}
