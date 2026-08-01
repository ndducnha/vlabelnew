import * as React from 'react';
import {
  PlusCircle, WarningCircle, ArrowRight, CalendarBlank, Camera, CheckCircle, Checks,
  CaretLeft, CaretRight, ClipboardText, X, Package, FileText, Eye, EyeSlash,
  GitBranch, SquaresFour, House, Key, Stack, ListBullets, Lock, SignOut, Envelope, Moon,
  Bell, BellSlash, User, Tag, QrCode, ArrowsClockwise, MagnifyingGlass, ShieldCheck, Sparkle,
  Trash, SkipBack, SkipForward, Play, Pause, Tray, CircleIcon,
} from 'phosphor-react-native';
import type { IconWeight } from 'phosphor-react-native';

// Bộ icon Phosphor (phong cách bo tròn, nhiều weight) - dùng chung với web, bớt cảm giác "mặc định AI".
// Giữ nguyên tên kiểu Ionicons cũ để đổi thư viện bên dưới mà không phải sửa call site.
const MAP: Record<string, any> = {
  'add-circle': PlusCircle, 'add-circle-outline': PlusCircle,
  'alert-circle': WarningCircle, 'arrow-forward': ArrowRight,
  'calendar-outline': CalendarBlank, camera: Camera, 'camera-outline': Camera,
  'checkmark-circle': CheckCircle, 'checkmark-done-outline': Checks,
  'chevron-back': CaretLeft, 'chevron-forward': CaretRight,
  'clipboard-outline': ClipboardText, close: X,
  cube: Package, 'cube-outline': Package,
  'document-text-outline': FileText, 'eye-outline': Eye, 'eye-off-outline': EyeSlash,
  'git-branch-outline': GitBranch, grid: SquaresFour, home: House,
  'key-outline': Key, 'layers-outline': Stack, list: ListBullets,
  'lock-closed-outline': Lock, 'log-out-outline': SignOut, 'mail-outline': Envelope,
  'moon-outline': Moon, notifications: Bell, 'notifications-outline': Bell,
  'notifications-off-outline': BellSlash, 'notifications-off': BellSlash,
  person: User, 'pricetag-outline': Tag, 'qr-code': QrCode, refresh: ArrowsClockwise,
  search: MagnifyingGlass, 'shield-checkmark-outline': ShieldCheck, 'shield-checkmark': ShieldCheck,
  sparkles: Sparkle, 'sparkles-outline': Sparkle, 'trash-outline': Trash,
  'play-skip-back': SkipBack, 'play-skip-forward': SkipForward, play: Play, pause: Pause,
  'file-tray-outline': Tray,
};

export type IconName = string;

export function Icon({ name, size = 20, color = '#000', weight = 'regular', style }: { name: string; size?: number; color?: string; weight?: IconWeight; strokeWidth?: number; style?: any }) {
  const L = MAP[name] || CircleIcon;
  return <L size={size} color={color} weight={weight} style={style} />;
}
