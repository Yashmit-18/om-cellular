"use client";

import { useState, useEffect } from "react";

interface Settings {
  business_phone?: string;
  business_email?: string;
}

const fallback: Settings = {
  business_phone: "+91 98765 43210",
  business_email: "info@omcellular.com",
};

function getVal(s: Settings, key: keyof Settings): string {
  return s[key] || fallback[key] || "";
}

export default function LegalContactInfo({ email }: { email?: string }) {
  const [settings, setSettings] = useState<Settings>(fallback);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          const map: Record<string, string> = {};
          for (const s of data.settings) map[s.key] = s.value;
          setSettings({
            business_phone: map.business_phone,
            business_email: map.business_email,
          });
        }
      })
      .catch(() => {});
  }, []);

  const phone = getVal(settings, "business_phone");
  const contactEmail = email || getVal(settings, "business_email");

  return (
    <>
      contact us at <strong>{contactEmail}</strong> or call <strong>{phone}</strong>.
    </>
  );
}
