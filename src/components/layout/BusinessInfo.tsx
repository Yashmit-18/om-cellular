"use client";

import { useState, useEffect } from "react";
import { Phone, MapPin, Mail, Clock, MessageCircle } from "lucide-react";
import Link from "next/link";

interface Settings {
  business_name?: string;
  business_phone?: string;
  business_whatsapp?: string;
  business_email?: string;
  business_address?: string;
  business_hours?: string;
  social_facebook?: string;
  social_instagram?: string;
  social_twitter?: string;
}

const fallback: Settings = {
  business_name: "OM Cellular",
  business_phone: "+91 98765 43210",
  business_whatsapp: "919876543210",
  business_email: "info@omcellular.com",
  business_address: "123 Mobile Market, Tech City, India",
  business_hours: "Mon-Sat: 9 AM - 8 PM",
};

function getVal(s: Settings, key: keyof Settings): string {
  return s[key] || fallback[key] || "";
}

export default function BusinessInfo({ section }: { section?: "footer" | "contact" }) {
  const [settings, setSettings] = useState<Settings>(fallback);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          const map: Settings = {};
          for (const s of data.settings) {
            (map as Record<string, string>)[s.key] = s.value;
          }
          setSettings(map);
        }
      })
      .catch(() => {});
  }, []);

  const phone = getVal(settings, "business_phone");
  const whatsapp = getVal(settings, "business_whatsapp");
  const email = getVal(settings, "business_email");
  const address = getVal(settings, "business_address");
  const hours = getVal(settings, "business_hours");
  const name = getVal(settings, "business_name");
  const fb = settings.social_facebook || "#";
  const ig = settings.social_instagram || "#";
  const tw = settings.social_twitter || "#";
  const waLink = whatsapp ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}` : "#";
  const telLink = phone ? `tel:${phone.replace(/[^0-9+]/g, "")}` : "#";

  if (section === "contact") {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2563eb]/10">
              <Phone className="h-5 w-5 text-[#2563eb]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Phone</h3>
              <p className="mt-0.5 text-sm text-gray-500">{phone}</p>
            </div>
          </div>
        </div>

        {whatsapp && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f97316]/10">
                <MessageCircle className="h-5 w-5 text-[#f97316]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">WhatsApp</h3>
                <a href={waLink} target="_blank" rel="noopener noreferrer" className="mt-0.5 text-sm text-[#2563eb] hover:underline">{phone}</a>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
              <Mail className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Email</h3>
              <p className="mt-0.5 text-sm text-gray-500">{email}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
              <MapPin className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Address</h3>
              <p className="mt-0.5 text-sm text-gray-500">{address}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Business Hours</h3>
              <p className="mt-1 text-sm text-gray-500">{hours}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sm:col-span-2 lg:col-span-2 lg:pr-6">
      <Link href="/" className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600">
          <Phone className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">{name}</span>
      </Link>
      <p className="text-gray-400 text-sm leading-relaxed mb-6">
        Your trusted mobile partner for buying, selling, exchanging, and
        repairing smartphones with expertise and care.
      </p>

      <div className="flex items-center gap-3 mb-6">
        {fb && fb !== "#" && (
          <a href={fb} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-800 hover:bg-blue-600 text-gray-400 hover:text-white transition-all duration-200">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" /></svg>
          </a>
        )}
        {tw && tw !== "#" && (
          <a href={tw} target="_blank" rel="noopener noreferrer" aria-label="Twitter"
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
          </a>
        )}
        {ig && ig !== "#" && (
          <a href={ig} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-800 hover:bg-pink-600 text-gray-400 hover:text-white transition-all duration-200">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" /></svg>
          </a>
        )}
      </div>

      <ul className="space-y-3 text-sm">
        <li className="flex items-start gap-2.5">
          <MapPin className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
          <span className="text-gray-400">{address}</span>
        </li>
        <li className="flex items-center gap-2.5">
          <Phone className="w-4 h-4 text-gray-500 shrink-0" />
          <a href={telLink} className="text-gray-400 hover:text-blue-400 transition-colors">{phone}</a>
        </li>
        <li className="flex items-center gap-2.5">
          <Mail className="w-4 h-4 text-gray-500 shrink-0" />
          <a href={`mailto:${email}`} className="text-gray-400 hover:text-blue-400 transition-colors">{email}</a>
        </li>
        {whatsapp && (
          <li className="flex items-center gap-2.5">
            <MessageCircle className="w-4 h-4 text-gray-500 shrink-0" />
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-green-400 transition-colors">WhatsApp Us</a>
          </li>
        )}
        <li className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-gray-500 shrink-0" />
          <span className="text-gray-400">{hours}</span>
        </li>
      </ul>
    </div>
  );
}
