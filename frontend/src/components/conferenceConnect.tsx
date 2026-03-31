'use client';

import { useState, useEffect } from "react";
import { RxCross2 } from "react-icons/rx";
import Input from "./ui/Input";
import { useRouter } from "next/navigation";

interface ConferenceConnectionModuleProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConferenceConnectionModule({ isOpen, onClose }: ConferenceConnectionModuleProps) {
  const [roomName, setRoomName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = 'auto';
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomName.trim()) {
      alert("Введите название комнаты");
      return;
    }

    setLoading(true);

    // Переходим на страницу конференции с room в query
    // ConferenceRoomPage сам сгенерирует userName, userId и получит токен
    router.push(`/conference?room=${encodeURIComponent(roomName.trim())}`);

    onClose();
    setLoading(false);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-white rounded-xl p-6 w-full max-w-md shadow-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Подключение к конференции
          </h2>
          <button 
            onClick={onClose}
            className="text-white bg-primary hover:bg-primary-hover rounded-full transition"
            type="button"
          >
            <RxCross2 size={28} />
          </button>
        </div>

        <form onSubmit={handleJoin} className="space-y-5">
          <Input
            label="Название комнаты"
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            required
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading || !roomName.trim()}
            className="w-full py-3 px-4 bg-primary hover:bg-primary-hover disabled:bg-secondary text-white font-semibold rounded-lg transition-all duration-150 disabled:cursor-not-allowed"
          >
            {loading ? 'Подключение...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}