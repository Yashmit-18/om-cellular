"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wrench,
  Clock,
  Shield,
  Star,
  Smartphone,
  Battery,
  Camera,
  Droplets,
  Monitor,
  Cpu,
  Zap,
  Award,
  ChevronRight,
} from "lucide-react";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import LoadingSkeleton from "@/components/ui/loading-skeleton";

interface RepairService {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  startingPrice: number;
  estimatedDuration: string | null;
  warranty: string | null;
  compatibleDevices: string;
}

const staticServices = [
  { id: "1", name: "Screen Replacement", slug: "screen-replacement", description: "Professional screen replacement with genuine parts for all major brands.", startingPrice: 1999, estimatedDuration: "1-2 hours", warranty: "90 days", compatibleDevices: "iPhone, Samsung, OnePlus, Xiaomi", icon: Monitor },
  { id: "2", name: "Battery Replacement", slug: "battery-replacement", description: "Restore your phone's battery life with high-quality replacement batteries.", startingPrice: 999, estimatedDuration: "30-60 mins", warranty: "180 days", compatibleDevices: "All brands", icon: Battery },
  { id: "3", name: "Camera Repair", slug: "camera-repair", description: "Fix blurry, cracked, or non-functional cameras with expert precision.", startingPrice: 1499, estimatedDuration: "1-3 hours", warranty: "90 days", compatibleDevices: "iPhone, Samsung, OnePlus", icon: Camera },
  { id: "4", name: "Software Fix", slug: "software-fix", description: "OS reinstallation, virus removal, software updates and optimization.", startingPrice: 499, estimatedDuration: "1-2 hours", warranty: "30 days", compatibleDevices: "All brands", icon: Cpu },
  { id: "5", name: "Water Damage Repair", slug: "water-damage", description: "Specialized water damage recovery using ultrasonic cleaning and component-level repair.", startingPrice: 1999, estimatedDuration: "24-48 hours", warranty: "90 days", compatibleDevices: "All brands", icon: Droplets },
  { id: "6", name: "Charging Port Repair", slug: "charging-port", description: "Fix loose connections, non-charging issues and port replacements.", startingPrice: 799, estimatedDuration: "30-60 mins", warranty: "90 days", compatibleDevices: "All brands", icon: Zap },
];

const trustFeatures = [
  { icon: Shield, title: "Expert Technicians", description: "Certified professionals with years of experience" },
  { icon: Award, title: "Genuine Parts", description: "Only authentic, high-quality replacement parts" },
  { icon: Clock, title: "Quick Turnaround", description: "Most repairs completed within 24-48 hours" },
  { icon: Star, title: "Warranty on Repairs", description: "Every repair comes with a service warranty" },
];

export default function RepairPage() {
  const [services, setServices] = useState<RepairService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/repair-services")
      .then((r) => r.json())
      .then((d) => {
        if (d.services && d.services.length > 0) {
          setServices(d.services);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const displayServices = services.length > 0
    ? services.map((s) => ({ ...s, icon: Monitor }))
    : staticServices;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 text-center sm:py-20">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2563eb]/20 backdrop-blur-sm">
            <Wrench className="h-8 w-8 text-[#2563eb]" />
          </div>
          <h1 className="mb-4 text-3xl font-bold sm:text-4xl lg:text-5xl">
            Expert Mobile Repairs You Can Trust
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-300">
            Professional repair services with genuine parts and warranty. Get your device fixed by certified experts.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/repair/book">
              <Button size="lg" className="bg-[#2563eb] hover:bg-[#1d4ed8]">
                Book a Repair <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/repair/track">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                Track Repair Status
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Features */}
      <section className="relative -mt-8 mx-auto max-w-5xl px-4 z-10">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {trustFeatures.map((feature) => (
            <div key={feature.title} className="rounded-xl bg-white p-5 shadow-md border border-gray-100 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#2563eb]/10">
                <feature.icon className="h-6 w-6 text-[#2563eb]" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-1 text-xs text-gray-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Our Repair Services</h2>
          <p className="mt-2 text-gray-500">Comprehensive repair solutions for all mobile devices</p>
        </div>

        {loading ? (
          <LoadingSkeleton variant="card" count={3} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayServices.map((service) => {
              const Icon = staticServices.find((s) => s.slug === service.slug)?.icon || Monitor;
              return (
                <Card key={service.id} hover className="flex flex-col">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#2563eb]/10">
                    <Icon className="h-7 w-7 text-[#2563eb]" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                  <p className="mt-2 flex-1 text-sm text-gray-500 leading-relaxed">{service.description}</p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
                    {service.estimatedDuration && (
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {service.estimatedDuration}</span>
                    )}
                    {service.warranty && (
                      <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> {service.warranty}</span>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                    <div>
                      <span className="text-xs text-gray-400">Starting at</span>
                      <p className="text-lg font-bold text-[#2563eb]">₹{service.startingPrice.toLocaleString("en-IN")}</p>
                    </div>
                    <Link href={`/repair/book?service=${service.id}`}>
                      <Button size="sm">Book Repair</Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-[#2563eb] py-16">
        <div className="mx-auto max-w-4xl px-4 text-center text-white">
          <Smartphone className="mx-auto mb-4 h-12 w-12" />
          <h2 className="text-2xl font-bold sm:text-3xl">Not Sure What&apos;s Wrong?</h2>
          <p className="mt-3 text-blue-100">Bring your device in for a free diagnosis. Our experts will identify the issue and provide a transparent quote.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/repair/book">
              <Button size="lg" className="bg-white text-[#2563eb] hover:bg-gray-100">Book Free Diagnosis</Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">Contact Us</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
