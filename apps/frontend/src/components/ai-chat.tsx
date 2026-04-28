'use client';

import React, { useEffect, useState } from 'react';
import { useChat } from '@livekit/components-react';
import type { ReceivedChatMessage } from '@livekit/components-react';

interface AgentMessage {
  text: string;
  timestamp: number;
  isFromUser: boolean;
}

export default function CustomChat() {
  const { chatMessages, send } = useChat();
  const [inputValue, setInputValue] = useState('');
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  
  const AGENT_IDENTITY = 'ml-agent';

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    try {
      await send(inputValue, { destinationIdentities: [AGENT_IDENTITY] });
      
      setAgentMessages(prev => [...prev, {
        text: inputValue,
        timestamp: Date.now(),
        isFromUser: true
      }]);
    } catch (error) {
      console.error('Failed to send message to agent:', error);
    }
    
    setInputValue('');
  };

  useEffect(() => {
    // Получаем сообщения от агента
    const agentMsgs = chatMessages.filter(msg => msg.from?.identity === AGENT_IDENTITY);
    agentMsgs.forEach(msg => {
      if (!agentMessages.some(agentMsg => agentMsg.timestamp === msg.timestamp)) {
        setAgentMessages(prev => [...prev, {
          text: msg.message,
          timestamp: msg.timestamp,
          isFromUser: false
        }]);
      }
    });
  }, [chatMessages, agentMessages]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0b1220' }}>
      <div style={{ 
        padding: '12px', 
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: '#0f172a',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '14px'
      }}>
        Чат с AI агентом
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {agentMessages.map((msg, idx) => {
          const isUserMessage = msg.isFromUser;
          const messageText = msg.text;
          const timestamp = msg.timestamp;
          
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
                  {!isUserMessage && 'Агент: '}
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
        
        {agentMessages.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            color: 'rgba(255,255,255,0.5)', 
            padding: '20px',
            fontSize: '14px'
          }}>
            Напишите сообщение AI агенту
          </div>
        )}
      </div>

      <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Сообщение AI агенту..."
            style={{
              flex: 1,
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