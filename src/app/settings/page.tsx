"use client";

import PageLayout from "../../components/PageLayout";
import { Settings, User, Bell, Shield, Database, Globe, Moon, Sun } from "lucide-react";

export default function SettingsPage() {
  const sections = [
    { icon: User, label: 'Profile Settings', description: 'Manage your personal information and public profile.' },
    { icon: Bell, label: 'Notifications', description: 'Configure how you receive alerts and updates.' },
    { icon: Shield, label: 'Security', description: 'Protect your account with 2FA and password management.' },
    { icon: Database, label: 'Data & Privacy', description: 'Manage your data usage and privacy preferences.' },
    { icon: Globe, label: 'Language & Region', description: 'Set your preferred language and time zone.' },
  ];

  return (
    <PageLayout title="Settings">
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1 space-y-2">
            {sections.map((section) => (
              <button 
                key={section.label}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors text-[14px] font-medium text-muted hover:text-main"
              >
                <section.icon size={18} />
                <span>{section.label}</span>
              </button>
            ))}
          </div>

          <div className="md:col-span-3 space-y-8">
            <div className="p-8 bg-secondary rounded-2xl border border-main space-y-8">
              <div className="flex items-center justify-between border-b border-main pb-6">
                <div>
                  <h3 className="text-[18px] font-bold">Profile Information</h3>
                  <p className="text-muted text-[13px]">Update your personal details here.</p>
                </div>
                <button className="px-6 py-2 bg-accent text-white rounded-lg text-[13px] font-semibold hover:bg-accent/90 transition-colors shadow-sm">
                  Save Changes
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-muted uppercase tracking-wider">Full Name</label>
                  <input 
                    type="text" 
                    defaultValue="John Doe"
                    className="w-full bg-main border border-main rounded-lg py-2.5 px-4 text-[14px] focus:outline-none focus:ring-1 focus:ring-accent/30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-muted uppercase tracking-wider">Email Address</label>
                  <input 
                    type="email" 
                    defaultValue="john.doe@fintrace.io"
                    className="w-full bg-main border border-main rounded-lg py-2.5 px-4 text-[14px] focus:outline-none focus:ring-1 focus:ring-accent/30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-muted uppercase tracking-wider">Username</label>
                  <input 
                    type="text" 
                    defaultValue="johndoe_trader"
                    className="w-full bg-main border border-main rounded-lg py-2.5 px-4 text-[14px] focus:outline-none focus:ring-1 focus:ring-accent/30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-muted uppercase tracking-wider">Timezone</label>
                  <select className="w-full bg-main border border-main rounded-lg py-2.5 px-4 text-[14px] focus:outline-none focus:ring-1 focus:ring-accent/30">
                    <option>UTC (Coordinated Universal Time)</option>
                    <option>EST (Eastern Standard Time)</option>
                    <option>PST (Pacific Standard Time)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-8 bg-main rounded-2xl border border-main space-y-6">
              <h3 className="text-[18px] font-bold">Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-secondary rounded-xl border border-main">
                  <div>
                    <div className="text-[14px] font-semibold">Dark Mode</div>
                    <p className="text-[12px] text-muted">Automatically switch to dark theme at night.</p>
                  </div>
                  <div className="w-12 h-6 bg-accent rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-secondary rounded-xl border border-main">
                  <div>
                    <div className="text-[14px] font-semibold">Email Notifications</div>
                    <p className="text-[12px] text-muted">Receive weekly portfolio summaries.</p>
                  </div>
                  <div className="w-12 h-6 bg-secondary border border-main rounded-full relative cursor-pointer">
                    <div className="absolute left-1 top-1 w-4 h-4 bg-muted rounded-full shadow-sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
