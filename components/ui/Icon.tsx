'use client';
import {
  Home, Calendar, Sparkles, Route, Wallet,
  Heart, MessageSquare, Plus, Check, ChevronRight,
  ChevronDown, MapPin, Star, Sun, Moon, Plane, BedDouble,
  Utensils, Waves, Search, Send, Mail, File, Paperclip,
  X, Users, Share2, Copy, ArrowLeft, Clock, Camera,
  Flame, Dumbbell, Bike, Ship, Pencil, History,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';

const ICONS: Record<string, React.ComponentType<LucideProps>> = {
  home: Home, calendar: Calendar, sparkles: Sparkles, route: Route,
  wallet: Wallet, heart: Heart, 'message-square': MessageSquare,
  plus: Plus, check: Check, 'chevron-right': ChevronRight,
  'chevron-down': ChevronDown, 'map-pin': MapPin, star: Star,
  sun: Sun, moon: Moon, plane: Plane, bed: BedDouble,
  utensils: Utensils, waves: Waves, search: Search, send: Send,
  mail: Mail, file: File, paperclip: Paperclip, x: X,
  users: Users, share: Share2, copy: Copy, 'arrow-left': ArrowLeft,
  clock: Clock, camera: Camera, flame: Flame, dumbbell: Dumbbell,
  bike: Bike, ship: Ship, edit: Pencil, history: History,
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
  className?: string;
}

export function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 1.9, fill = 'none', className = '' }: IconProps) {
  const Comp = ICONS[name];
  if (!Comp) return null;
  return (
    <Comp
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      fill={fill}
      className={className}
    />
  );
}
