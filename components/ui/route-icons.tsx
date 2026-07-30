"use client";

import {
  Archive,
  BellRing,
  BookOpenCheck,
  Building2,
  CalendarCheck2,
  CalendarDays,
  CarFront,
  ClipboardCheck,
  ClipboardList,
  CloudSun,
  Ellipsis,
  FileUp,
  Handshake,
  HeartPulse,
  Home,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LogIn,
  MailPlus,
  MapPin,
  Megaphone,
  MessageCircle,
  Palette,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserCog,
  UserPlus,
  UsersRound,
  Wrench,
  type LucideIcon
} from "lucide-react";

const iconByHref: Record<string, LucideIcon> = {
  "/": Home,
  "/registration": UserPlus,
  "/schedule": CalendarDays,
  "/sponsors": Handshake,
  "/auth": LogIn,
  "/account": UserCog,
  "/invite/recover": KeyRound,

  "/parent": Home,
  "/parent/schedule": CalendarDays,
  "/parent/rsvp": CalendarCheck2,
  "/parent/messages": MessageCircle,
  "/parent/photos": ImageIcon,
  "/parent/practice-recaps": BookOpenCheck,
  "/parent/family-access": ShieldCheck,
  "/parent/transportation": CarFront,
  "/parent/settings": Settings,
  "/parent/more": Ellipsis,

  "/coach": LayoutDashboard,
  "/coach/schedule": CalendarDays,
  "/coach/attendance": ClipboardCheck,
  "/coach/messages": MessageCircle,
  "/coach/practice-recaps": Sparkles,
  "/coach/roster": UsersRound,
  "/coach/snacks-volunteers": UsersRound,
  "/coach/weather-fields": CloudSun,
  "/coach/drafts": ClipboardList,
  "/coach/settings": Settings,

  "/admin": LayoutDashboard,
  "/admin/registrations": UserCheck,
  "/admin/teams": UsersRound,
  "/admin/family-access": ShieldCheck,
  "/admin/schedule-venues": MapPin,
  "/admin/communications": Megaphone,
  "/admin/safety-weather": CloudSun,
  "/admin/media-review": ImageIcon,
  "/admin/sponsors": Handshake,
  "/admin/branding": Palette,
  "/admin/reports-archive": Archive,
  "/admin/security-audit": ShieldCheck,
  "/admin/message-delivery-review": BellRing,
  "/admin/settings": Settings,
  "/admin/operations": Wrench,
  "/admin/imports": FileUp,
  "/admin/invites": MailPlus,
  "/admin/memberships": ListChecks,
  "/admin/health": HeartPulse
};

const iconByRole: Record<string, LucideIcon> = {
  parent: Home,
  coach: LayoutDashboard,
  admin: Building2
};

export function RouteIcon({
  href,
  short,
  role,
  size = 17
}: {
  href: string;
  short: string;
  role?: string;
  size?: number;
}) {
  const Icon = iconByHref[href] ?? (role ? iconByRole[role] : undefined);
  if (!Icon) return <>{short}</>;
  return <Icon aria-hidden="true" size={size} strokeWidth={2.2} />;
}
