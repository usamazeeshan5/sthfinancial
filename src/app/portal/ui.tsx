"use client";

import React from "react";

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl sm:rounded-[28px] p-6 sm:p-7 shadow-[0_24px_70px_-12px_rgba(0,0,0,0.45)]">
      {children}
    </div>
  );
}

export function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block mb-3">
      <span className="block text-[13px] font-semibold text-[#374151] mb-1.5">{label}</span>
      <input
        {...props}
        className="w-full h-12 px-4 bg-[#F9FAFB] border border-[#EDEFF2] rounded-xl text-[15px] text-[#111827] focus:outline-none focus:border-[#E23744] focus:bg-white focus:ring-4 focus:ring-[#E23744]/10 transition-all"
      />
    </label>
  );
}

export function PrimaryButton({
  children,
  busy,
  ...props
}: { busy?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="w-full h-[52px] mt-2 rounded-2xl text-white text-[16px] font-bold bg-gradient-to-b from-[#F0714B] to-[#E23744] shadow-lg shadow-[#E23744]/30 transition-all active:scale-[0.98] enabled:hover:brightness-105 disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {busy && (
        <span className="inline-block w-4 h-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
      )}
      {children}
    </button>
  );
}

export function ErrorBox({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="mb-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-3.5 py-2.5 text-sm text-[#B91C1C]">
      {children}
    </div>
  );
}

export function Footer() {
  return (
    <p className="text-center text-xs text-white/70 mt-5">Secured by Square · lovetap.me</p>
  );
}
