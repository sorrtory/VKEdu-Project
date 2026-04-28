'use client';

import React, { useState } from 'react';
import { useChat } from '@livekit/components-react';
import type { ReceivedChatMessage } from '@livekit/components-react';

interface CustomChatProps {
  agentIdentity: string;
}

export const CustomChat: React.FC<CustomChatProps> = ({ agentIdentity }) => {
  const { chatMessages, send } = useChat();
  const [activeTab, setActiveTab] = useState<'room' | 'agent'>('room');
  const [inputValue, setInputValue] = useState('');
  const [agentMessages, setAgentMessages] = useState<{ text: string; timestamp: number; isFromUser: boolean }[]>([]);

  const roomMessages = chatMessages.filter((msg) => {
    if (activeTab === 'agent') return false;
    const isFromAgent = msg.from?.identity === agentIdentity;
    return !isFromAgent;
  });

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    if (activeTab === 'room') {
      await send(inputValue);
    } else {
      const agentParticipant = chatMessages.find(msg => msg.from?.identity === agentIdentity)?.from;
      
      if (agentParticipant) {
        // Используем participantIdentity для отправки только агенту
        await send(inputValue, { destinationIdentity: agentIdentity });
        
        // Добавляем сообщение в локальный стейт для вкладки агента
        setAgentMessages(prev => [...prev, {
          text: inputValue,
          timestamp: Date.now(),
          isFromUser: true
        }]);
      } else {
        console.warn('Agent not found in the room yet');
      }
    }
    setInputValue('');
  };

  // Функция для получения ответов от агента (нужно подключить через отдельный data channel)
  // Это упрощенный пример — в реальности нужно слушать сообщения от агента
  React.useEffect(() => {
    // Подписка на сообщения от агента через отдельный канал
    const handleAgentMessage = (msg: ReceivedChatMessage) => {
      if (msg.from?.identity === agentIdentity && activeTab === 'agent') {
        setAgentMessages(prev => [...prev, {
          text: msg.message,
          timestamp: msg.timestamp,
          isFromUser: false
        }]);
      }
    };

    // Используем существующие сообщения для демонстрации
    const agentMsgHandler = (msg: ReceivedChatMessage) => {
      if (msg.from?.identity === agentIdentity) {
        handleAgentMessage(msg);
      }
    };

    // Добавляем слушателя к существующим сообщениям
    const checkForAgentMessages = () => {
      const agentMsgs = chatMessages.filter(msg => msg.from?.identity === agentIdentity);
      agentMsgs.forEach(msg => {
        if (!agentMessages.some(agentMsg => agentMsg.timestamp === msg.timestamp)) {
          setAgentMessages(prev => [...prev, {
            text: msg.message,
            timestamp: msg.timestamp,
            isFromUser: false
          }]);
        }
      });
    };

    checkForAgentMessages();
  }, [chatMessages, agentIdentity, agentMessages, activeTab]);

  const getCurrentMessages = () => {
    if (activeTab === 'room') {
      return roomMessages;
    } else {
      return agentMessages;
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0b1220' }}>
      {/* Вкладки */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <button
          onClick={() => setActiveTab('room')}
          style={{
            flex: 1,
            padding: '12px',
            background: activeTab === 'room' ? '#1e293b' : 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontWeight: activeTab === 'room' ? 'bold' : 'normal'
          }}
        >
          Общий чат
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
          ML Агент
        </button>
      </div>

      {/* Область сообщений */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {getCurrentMessages().map((msg, idx) => {
          const isUserMessage = 'from' in msg ? msg.from?.identity === 'You' : msg.isFromUser;
          const messageText = 'message' in msg ? msg.message : msg.text;
          const timestamp = 'timestamp' in msg ? msg.timestamp : msg.timestamp;
          
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
                  {!isUserMessage && activeTab === 'agent' && '🤖 Агент: '}
                  {!isUserMessage && activeTab === 'room' && `${'from' in msg ? msg.from?.identity : 'Agent'}: `}
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
      </div>

      {/* Поле ввода */}
      <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={activeTab === 'room' ? "Сообщение всем..." : "Сообщение ML агенту..."}
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
};