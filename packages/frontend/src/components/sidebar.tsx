'use client';

import { useState } from 'react'; import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LogOut,
} from 'lucide-react';
import {
    DashboardIcon,
    AnalyticsIcon,
    ApplicationsIcon,
    PoliciesIcon,
    EventsIcon,
    AssetsIcon,
    EnrollmentIcon,
    PatternsIcon,
    AuditLogsIcon,
    SettingsIcon,
    UserIcon,
    ArrowDownIcon,
} from '@/components/custom-icons';
import { useAuth } from '@/contexts/auth-context';

const navigation = [
    { name: 'Overview', href: '/dashboard', icon: DashboardIcon },
    { name: 'Analytics', href: '/dashboard/analytics', icon: AnalyticsIcon },
    { name: 'Applications', href: '/dashboard/applications', icon: ApplicationsIcon },
    { name: 'Policies', href: '/dashboard/policies', icon: PoliciesIcon },
    { name: 'Events', href: '/dashboard/events', icon: EventsIcon },
    { name: 'Assets', href: '/dashboard/assets', icon: AssetsIcon },
    { name: 'Deployment', href: '/dashboard/deployment', icon: EnrollmentIcon },
    { name: 'Patterns', href: '/dashboard/patterns', icon: PatternsIcon },
    { name: 'Audit Logs', href: '/dashboard/audit-logs', icon: AuditLogsIcon },
    { name: 'Settings', href: '/dashboard/settings', icon: SettingsIcon },
];

export function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    return (
        <div className="flex h-full w-[239px] flex-col bg-white border-r border-[#D4C8FF]/50 flex-shrink-0">
            {/* Header / Logo — pt-[25px] px-[24px] per Figma */}
            <div className="px-[24px] pt-[25px]">
                <div className="flex items-center h-[34px] relative w-[160px]">
                    <Image
                        src="/onefend_logo.svg"
                        alt="Onefend Logo"
                        fill
                        className="object-contain object-left"
                        priority
                    />
                </div>
            </div>

            {/* Divider after logo — Vector 4 at top: 79px in Figma */}
            <div className="h-px bg-[#D4C8FF]/50 mt-[27px]" />

            {/* Module Indicator — top: 95px in Figma, 16px below divider */}
            <div className="px-[24px] pt-[16px] pb-[8px]">
                <span className="text-[9px] uppercase text-[#A5AEB7] font-medium tracking-wider block mb-[4px]">ACTIVE MODULE</span>
                <div className="flex items-center gap-[6px]">
                    <div className="h-[6px] w-[6px] rounded-full bg-[#6466FF] flex-shrink-0"></div>
                    <span className="text-[13px] font-medium text-[#1E1B39]">AI Security</span>
                </div>
            </div>

            {/* Navigation */}
            <div className="pt-2 pb-6">
                <nav className="px-6">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "group flex items-center px-[14px] py-[15px] text-[14px] font-medium transition-all duration-150 gap-[10px] w-full",
                                    isActive
                                        ? "bg-[#6466FF] text-white"
                                        : "text-[#1E1B39] hover:bg-[#F6F0FF]"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        "h-[18px] w-[18px] flex-shrink-0",
                                        isActive ? "text-white" : "text-[#1E1B39]"
                                    )}
                                />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Divider similar to the top one */}
            <div className="h-px bg-[#D4C8FF]/50" />

            {/* Footer / User Profile */}
            <div className="relative">
                {isDropdownOpen && (
                    <div className="absolute top-full left-[-1px] right-[-1px] bg-white border border-[#D4C8FF]/50 border-t-0 shadow-sm z-20">
                        <button
                            onClick={logout}
                            className="flex w-full items-center justify-between px-[37px] pr-[120px] py-[23px] h-[65px] bg-[#FAF7FF] hover:bg-[#D4C8FF]/20 transition-colors cursor-pointer"
                        >
                            <span className="text-[14px] font-medium text-[#1E1B39]">Log out</span>
                            <LogOut className="h-[18px] w-[18px] text-[#1E1B39]" />
                        </button>
                    </div>
                )}
                <div
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center px-[36px] py-[25px] h-[86px] cursor-pointer hover:bg-[#FAF7FF] transition-colors bg-white relative z-10"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 text-[#1E1B39]">
                            {user?.email ? (
                                <UserIcon className="h-[28px] w-[28px]" />
                            ) : (
                                <UserIcon className="h-[28px] w-[28px]" />
                            )}
                        </div>
                        <span className="text-[14px] font-medium text-[#1E1B39] truncate max-w-[100px]" title={user?.email}>
                            {user?.email ? user.email.split('@')[0] : 'Unknown User'}
                        </span>
                    </div>
                    <div className="ml-auto">
                        <ArrowDownIcon 
                            className={cn(
                                "h-4 w-4 text-[#1E1B39] transition-transform duration-200",
                                isDropdownOpen && "rotate-180"
                            )} 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
