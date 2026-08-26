import Link from "next/link";
import {
  Shield,
  Award,
  Wrench,
  RotateCcw,
} from "lucide-react";
import BusinessInfo from "./BusinessInfo";

const trustBadges = [
  {
    icon: Shield,
    label: "Secure Payment",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: Award,
    label: "Genuine Parts",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    icon: Wrench,
    label: "Expert Repair",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
  {
    icon: RotateCcw,
    label: "Easy Returns",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
];

const shopLinks = [
  { label: "Smartphones", href: "/phones" },
  { label: "Pre-Owned Phones", href: "/phones?refurbished=true" },
  { label: "Accessories", href: "/accessories" },
  { label: "Offers", href: "/offers" },
  { label: "All Brands", href: "/categories" },
];

const serviceLinks = [
  { label: "Sell Your Phone", href: "/sell-phone" },
  { label: "Phone Exchange", href: "/exchange" },
  { label: "Mobile Repair", href: "/repair" },
  { label: "Book a Repair", href: "/repair/book" },
  { label: "Track Repair", href: "/repair/track" },
];

const companyLinks = [
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
  { label: "FAQ", href: "/faq" },
  { label: "Reviews", href: "/faq#reviews" },
  { label: "Careers", href: "#" },
];

const supportLinks = [
  { label: "Track Order", href: "/track-order" },
  { label: "Returns & Refunds", href: "/refund-policy" },
  { label: "Warranty Info", href: "/faq" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms & Conditions", href: "/terms" },
];

const bottomBarLinks = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Refund Policy", href: "/refund-policy" },
];

function FooterLinkColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-white font-semibold text-sm tracking-wide uppercase mb-5">
        {title}
      </h3>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-gray-400 text-sm hover:text-blue-400 transition-colors duration-200"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-300">
      {/* Trust Badges Bar */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {trustBadges.map((badge) => {
              const Icon = badge.icon;
              return (
                <div
                  key={badge.label}
                  className="flex items-center justify-center gap-3"
                >
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${badge.bg}`}
                  >
                    <Icon className={`w-5 h-5 ${badge.color}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-300">
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-10 lg:gap-8">
          {/* Column 1: Brand Info */}
          <BusinessInfo section="footer" />

          {/* Column 2: Shop */}
          <FooterLinkColumn title="Shop" links={shopLinks} />

          {/* Column 3: Services */}
          <FooterLinkColumn title="Services" links={serviceLinks} />

          {/* Column 4: Company */}
          <FooterLinkColumn title="Company" links={companyLinks} />

          {/* Column 5: Support */}
          <FooterLinkColumn title="Support" links={supportLinks} />
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
            <p>© 2026 OM Cellular. All rights reserved.</p>
            <div className="flex items-center gap-4">
              {bottomBarLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="hover:text-gray-300 transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}