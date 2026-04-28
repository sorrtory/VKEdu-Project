'use client';

import React, { useContext, useEffect, useState } from 'react';
import { useChat, RoomContext } from '@livekit/components-react';
import type { ReceivedChatMessage } from '@livekit/components-react';
import { DataPacket_Kind } from 'livekit-client';

interface AgentMessage {
  text: string;
  timestamp: number;
  isFromUser: boolean;
}

export default function CustomChat() {
  const { chatMessages, send } = useChat();
  const roomContext = useContext(RoomContext);
  const room = roomContext?.room || null;
  
  const [activeTab, setActiveTab] = useState<'general' | 'agent'>('general');
  const [inputValue, setInputValue] = useState('');
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  
  const AGENT_IDENTITY = 'default-agent';

  const generalMessages = chatMessages.filter((msg) => {
    const isFromAgent = msg.from?.identity === AGENT_IDENTITY;
    return !isFromAgent;
  });

  // Отправка сообщения агенту через data channel
  const sendToAgent = async (message: string) => {
    if (!room) {
      console.error('Room not available');
      return false;
    }

    const agent = room.participants.get(AGENT_IDENTITY);
    if (!agent) {
      console.error('Agent not found in room');
      return false;
    }

    try {
      const localParticipant = room.localParticipant;
      await localParticipant.publishData(
        JSON.stringify({ type: 'agent_message', message }),
        DataPacket_Kind.RELIABLE,
        [agent.identity]
      );
      return true;
    } catch (error) {
      console.error('Failed to send to agent:', error);
      return false;
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    if (activeTab === 'general') {
      // Отправка в общий чат
      await send(inputValue);
    } else {
      // Отправка агенту
      const success = await sendToAgent(inputValue);
      
      // Добавляем сообщение в локальный список (оптимистичное обновление)
      setAgentMessages(prev => [...prev, {
        text: inputValue,
        timestamp: Date.now(),
        isFromUser: true
      }]);
      
      if (!success) {
        console.warn('Message may not have been delivered to agent');
      }
    }
    setInputValue('');
  };

  // Слушаем data channel сообщения от агента
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array, participant: any) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === 'agent_message' && participant.identity === AGENT_IDENTITY) {
          setAgentMessages(prev => {
            // Проверяем, нет ли уже такого сообщения
            if (prev.some(msg => msg.text === data.message && msg.timestamp === data.timestamp)) {
              return prev;
            }
            return [...prev, {
              text: data.message,
              timestamp: Date.now(),
              isFromUser: false
            }];
          });
        }
      } catch (e) {
        // Не JSON сообщение или не от агента
        console.debug('Received non-agent message via data channel');
      }
    };

    room.on('dataReceived', handleDataReceived);
    
    return () => {
      room.off('dataReceived', handleDataReceived);
    };
  }, [room, AGENT_IDENTITY]);

  // Также слушаем обычные chat сообщения от агента (на случай если агент использует обычный чат)
  useEffect(() => {
    const agentMsgs = chatMessages.filter(msg => msg.from?.identity === AGENT_IDENTITY);
    agentMsgs.forEach(msg => {
      if (!agentMessages.some(agentMsg => agentMsg.text === msg.message && agentMsg.timestamp === msg.timestamp)) {
        setAgentMessages(prev => [...prev, {
          text: msg.message,
          timestamp: msg.timestamp,
          isFromUser: false
        }]);
      }
    });
  }, [chatMessages, agentMessages, AGENT_IDENTITY]);

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
      {/* Вкладки переключения */}
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
          AI Агент
        </button>
      </div>

      {/* Область сообщений */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {getCurrentMessages().map((msg, idx) => {
          const isUserMessage = isReceivedChatMessage(msg) 
            ? msg.from?.identity !== AGENT_IDENTITY
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
                  {!isUserMessage && senderName === AGENT_IDENTITY && 'AI Агент: '}
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

      {/* Поле ввода */}
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