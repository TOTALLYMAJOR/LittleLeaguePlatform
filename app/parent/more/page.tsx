import Link from "next/link";
import {
  BookOpenCheck,
  CarFront,
  CircleHelp,
  CloudOff,
  Images,
  Settings,
  UserCog
} from "lucide-react";

const moreDestinations = [
  {
    href: "/parent/practice-recaps",
    label: "Practice Replays",
    description: "Open coach-published practice memories.",
    Icon: BookOpenCheck
  },
  {
    href: "/parent/photos",
    label: "Photos",
    description: "View family-visible team media.",
    Icon: Images
  },
  {
    href: "/parent/transportation",
    label: "Transportation",
    description: "Review ride requests, offers, and accepted plans.",
    Icon: CarFront
  },
  {
    href: "/parent/settings",
    label: "Settings",
    description: "Open family preferences and current settings.",
    Icon: Settings
  },
  {
    href: "/account",
    label: "Account",
    description: "Review identity, memberships, security, and sign out.",
    Icon: UserCog
  },
  {
    href: "/invite/recover",
    label: "Support",
    description: "Get help with an invitation or access review.",
    Icon: CircleHelp
  },
  {
    href: "/offline",
    label: "Offline and synchronization status",
    description: "Check what remains available without a connection.",
    Icon: CloudOff
  }
] as const;

export default function ParentMorePage() {
  return (
    <div className="page family-more-page">
      <header className="family-more-heading">
        <h1>More family tools</h1>
        <p>Find less frequent family tasks without leaving the Family experience.</p>
      </header>

      <nav aria-label="More family tools">
        <ul className="family-more-list">
          {moreDestinations.map(({ href, label, description, Icon }) => (
            <li key={href}>
              <Link href={href}>
                <Icon aria-hidden="true" size={22} strokeWidth={2.2} />
                <span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export const metadata = {
  title: "More Family Tools"
};
