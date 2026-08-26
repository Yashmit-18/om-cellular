"use client";

import {
  Smartphone,
  Award,
  Users,
  MapPin,
  Clock,
  Shield,
  Wrench,
  Heart,
  Star,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/button";

const stats = [
  { value: "8+", label: "Years of Experience" },
  { value: "50,000+", label: "Devices Repaired" },
  { value: "1,00,000+", label: "Happy Customers" },
  { value: "15,000+", label: "Phones Sold" },
];

const whyChooseUs = [
  { icon: Wrench, title: "Expert Repairs", description: "Certified technicians with years of experience in mobile repair for all brands." },
  { icon: Shield, title: "Genuine Parts", description: "We use only original and high-quality replacement parts for lasting results." },
  { icon: Award, title: "Trusted Experience", description: "Serving customers since 2017 with consistent quality and transparent pricing." },
  { icon: Heart, title: "Customer First", description: "Your satisfaction is our priority. We offer warranty on all services." },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2563eb] via-[#1d4ed8] to-[#1e40af] text-white">
        <div className="relative mx-auto max-w-7xl px-4 py-20 text-center sm:py-24">
          <h1 className="mb-4 text-3xl font-bold sm:text-4xl lg:text-5xl">About OM Cellular</h1>
          <p className="mx-auto max-w-2xl text-lg text-blue-100">
            Your trusted destination for buying, selling, exchanging, and repairing mobile phones.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Our Story</h2>
            <div className="mt-6 space-y-4 text-gray-600 leading-relaxed">
              <p>
                OM Cellular was founded in 2017 with a simple mission: to make mobile technology accessible and affordable for everyone. What started as a small repair shop has grown into a comprehensive mobile solutions center.
              </p>
              <p>
                We noticed that customers often faced challenges finding trustworthy repair services, fair prices for their old phones, and reliable refurbished devices. That&apos;s when we decided to build a one-stop platform that addresses all these needs.
              </p>
              <p>
                Today, we serve thousands of customers every month across multiple locations, offering everything from expert repairs with genuine parts to the best exchange values for your old devices.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="flex h-72 w-72 items-center justify-center rounded-3xl bg-gradient-to-br from-[#2563eb]/10 to-[#f97316]/10">
                <Smartphone className="h-32 w-32 text-[#2563eb]/30" />
              </div>
              <div className="absolute -bottom-4 -right-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#f97316] shadow-lg">
                <Award className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Our Mission</h2>
          <p className="mx-auto mt-4 max-w-2xl text-gray-600 leading-relaxed">
            To provide transparent, reliable, and affordable mobile solutions while building lasting relationships with our customers through trust and quality service.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
              <Clock className="mx-auto mb-3 h-8 w-8 text-[#2563eb]" />
              <h3 className="font-semibold text-gray-900">Quick Service</h3>
              <p className="mt-1 text-sm text-gray-500">Most repairs done within 24-48 hours</p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
              <MapPin className="mx-auto mb-3 h-8 w-8 text-[#f97316]" />
              <h3 className="font-semibold text-gray-900">Doorstep Service</h3>
              <p className="mt-1 text-sm text-gray-500">Pickup and delivery at your convenience</p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
              <Shield className="mx-auto mb-3 h-8 w-8 text-emerald-500" />
              <h3 className="font-semibold text-gray-900">Warranty</h3>
              <p className="mt-1 text-sm text-gray-500">Service warranty on all repairs</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="mb-10 text-center text-2xl font-bold text-gray-900 sm:text-3xl">Why Choose Us</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {whyChooseUs.map((item) => (
            <div key={item.title} className="rounded-xl border border-gray-200 p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#2563eb]/10">
                <item.icon className="h-7 w-7 text-[#2563eb]" />
              </div>
              <h3 className="font-semibold text-gray-900">{item.title}</h3>
              <p className="mt-2 text-sm text-gray-500">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-800 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-white sm:text-4xl">{stat.value}</p>
                <p className="mt-1 text-sm text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Ready to Experience OM Cellular?</h2>
          <p className="mt-3 text-gray-500">Visit us today or explore our services online.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/contact"><Button size="lg">Contact Us</Button></Link>
            <Link href="/repair"><Button size="lg" variant="outline">Our Services</Button></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
