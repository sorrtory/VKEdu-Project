"use client";

import Image from "next/image";
import { useState } from "react";
import { FaCalendar } from "react-icons/fa";
import { FaUserGroup } from "react-icons/fa6";
import { IoIosVideocam } from "react-icons/io";
import ConferenceConnectionModule from "../components/conferenceConnect";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center p-10">
      <div className="flex flex-col items-center justify-center gap-4 max-w-4x px-4">
        <div className="flex justify-center items-center mb-12">
          <div className="relative w-80 h-40 overflow-hidden">
            <Image
              src="/images/LogoBB.png"
              alt="Logo"
              fill
              priority
              className="object-cover object-center"
              sizes="320px"
            />
          </div>
        </div>
        <div className="flex gap-4 justify-center">
          <button className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-4 h-71 w-71 flex flex-col items-center justify-center gap-2 transition-colors duration-200">
            <IoIosVideocam size={100} />
            <span className="text-lg">
              Создать <br /> Встречу
            </span>
          </button>
          
          <div className="flex flex-col gap-3">
            <button 
              className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-4 h-34 w-34 flex flex-col items-center justify-center gap-2 transition-colors duration-200"
              onClick={() => setIsModalOpen(true)} // ← Уже было
            >
              <FaUserGroup size={40} />
              <span>Подключиться</span>
            </button>
            <button className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-4 h-34 w-34 flex flex-col items-center justify-center gap-2 transition-colors duration-200">
              <FaCalendar size={40} />
              <span className="flex flex-col text-center">
                <span>Запланировать</span>
                <span>Встречу</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <ConferenceConnectionModule 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}