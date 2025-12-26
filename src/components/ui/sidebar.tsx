"use client";

import { useState } from "react";
import {
  Image,
  Video,
  MessageCircle,
  Mic,
  Settings,
  Home,
  Palette,
  Film,
  Bot,
  Music
} from "lucide-react";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onCollapseAll: () => void;
}

const navigationItems = [
  {
    id: 'gallery',
    label: 'Gallery',
    icon: Image,
    section: 'gallery'
  },
  {
    id: 'photo',
    label: 'Photo Gen',
    icon: Palette,
    section: 'photo'
  },
  {
    id: 'video',
    label: 'Video Gen',
    icon: Film,
    section: 'video'
  },
  {
    id: 'chat',
    label: 'AI Chat',
    icon: Bot,
    section: 'chat'
  },
  {
    id: 'voice',
    label: 'Voice',
    icon: Music,
    section: 'voice'
  }
];

export default function Sidebar({ activeSection, onSectionChange, onCollapseAll }: SidebarProps) {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      // Get the element's position relative to the viewport
      const elementRect = element.getBoundingClientRect();
      const absoluteElementTop = elementRect.top + window.pageYOffset;

      // Calculate scroll position (accounting for any fixed headers)
      const scrollToPosition = absoluteElementTop - 20; // Small offset for breathing room

      // Use window.scrollTo for more control and gentler scrolling
      window.scrollTo({
        top: scrollToPosition,
        behavior: 'smooth'
      });

      // Trigger the section change to expand it after a brief delay
      // This ensures the scroll animation completes first
      setTimeout(() => {
        onSectionChange(sectionId);
      }, 300);
    }
  };

  return (
    <div className="fixed left-0 top-0 h-full w-20 bg-white/5 backdrop-blur-xl border-r border-white/10 shadow-2xl z-40">
      <div className="flex flex-col items-center py-6 space-y-2">
        {/* Logo/Brand */}
        <div className="mb-8">
          <button
            onClick={onCollapseAll}
            className="group w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 rounded-xl border border-white/10 hover:border-white/20 flex items-center justify-center transition-all duration-300 hover:scale-105"
            title="Collapse All Sections"
          >
            <span className="text-white font-bold text-lg group-hover:text-blue-200 transition-colors duration-300">C</span>
          </button>
        </div>

        {/* Navigation Items */}
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.section;

          return (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.section)}
              className={`group relative w-14 h-14 rounded-xl transition-all duration-300 flex items-center justify-center ${
                isActive
                  ? 'bg-blue-500/20 border border-blue-400/30 shadow-lg shadow-blue-500/10'
                  : 'hover:bg-white/10 border border-transparent hover:border-white/20'
              }`}
              title={item.label}
            >
              <Icon
                className={`w-5 h-5 transition-all duration-300 ${
                  isActive
                    ? 'text-blue-300'
                    : 'text-slate-400 group-hover:text-white'
                }`}
              />

              {/* Tooltip */}
              <div className="absolute left-full ml-3 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap border border-white/10 backdrop-blur-sm">
                {item.label}
                <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-l-4 border-l-slate-800 border-r-4 border-r-transparent"></div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
