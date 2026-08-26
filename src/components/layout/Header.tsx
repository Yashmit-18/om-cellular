"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Heart,
  ShoppingCart,
  User,
  Menu,
  X,
  ChevronDown,
  Phone,
} from "lucide-react";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Buy Phone", href: "/buy-phone" },
  { label: "Sell Phone", href: "/sell-phone" },
  { label: "Exchange", href: "/exchange" },
  { label: "Repair", href: "/repair" },
  { label: "Accessories", href: "/accessories" },
  { label: "Offers", href: "/offers" },
];

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  return (
    <>
      <header
        className={`sticky top-0 z-50 border-b transition-all duration-300 ${
          scrolled
            ? "bg-white/95 shadow-lg backdrop-blur-md"
            : "bg-white shadow-sm"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:h-18">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100 lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2563eb]">
              <Phone className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">
              OM <span className="text-[#2563eb]">Cellular</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => {
              const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[#2563eb]/10 text-[#2563eb]"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="relative rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#f97316] text-[10px] font-bold text-white">
                0
              </span>
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              className="relative rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              aria-label="Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#2563eb] text-[10px] font-bold text-white">
                0
              </span>
            </Link>

            {/* Account */}
            <div ref={accountRef} className="relative hidden lg:block">
              <button
                onClick={() => setAccountOpen(!accountOpen)}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                <User className="h-4 w-4" />
                <span>Account</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl">
                  <Link
                    href="/auth/login"
                    className="block px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    className="block px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Create Account
                  </Link>
                  <Link
                    href="/account/orders"
                    className="block px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    My Orders
                  </Link>
                  <div className="my-1 border-t border-gray-100" />
                  <Link
                    href="/admin"
                    className="block px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Admin Panel
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile account */}
            <Link
              href="/auth/login"
              className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 lg:hidden"
              aria-label="Account"
            >
              <User className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-7xl px-4 pt-4">
            <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-2xl">
              <Search className="h-5 w-5 shrink-0 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search phones, accessories, services..."
                className="flex-1 bg-transparent text-lg text-gray-900 outline-none placeholder:text-gray-400"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 rounded-2xl bg-white p-6 shadow-2xl">
              <p className="mb-3 text-sm font-medium text-gray-500">Popular Searches</p>
              <div className="flex flex-wrap gap-2">
                {["iPhone 15", "Samsung Galaxy", "Screen Repair", "Phone Cases", "Battery Replacement"].map(
                  (term) => (
                    <span
                      key={term}
                      className="cursor-pointer rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-[#2563eb] hover:bg-[#2563eb]/5 hover:text-[#2563eb]"
                    >
                      {term}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-4">
              <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563eb]">
                  <Phone className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900">
                  OM <span className="text-[#2563eb]">Cellular</span>
                </span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
              {navLinks.map((link) => {
                const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`mx-2 block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-[#2563eb]/10 text-[#2563eb]"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t p-4 space-y-2">
              <Link
                href="/auth/login"
                className="block rounded-lg bg-[#2563eb] px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="block rounded-lg border border-gray-200 px-4 py-2.5 text-center text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
