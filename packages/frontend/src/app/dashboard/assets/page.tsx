'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/protected-route';
import { Laptop, Building2 } from 'lucide-react';
import DevicesPage from '@/components/dashboard/devices-view';
import GroupsPage from '@/components/dashboard/groups-view';

export default function AssetsPage() {
    const [activeTab, setActiveTab] = useState<'DEVICES' | 'GROUPS'>('DEVICES');

    return (
        <ProtectedRoute>
            <div className="flex flex-col min-h-full pl-[21px] pr-[24px] py-[24px] gap-[20px]">
                <div className="flex justify-between items-center bg-white border-b border-[#D4C8FF]/50 px-8 py-8 -mx-8 -mt-6">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-[24px] font-semibold text-[#1E1B39] tracking-tight leading-[30px]">Asset Management</h1>
                        <p className="text-[14px] font-medium text-[#9199A1] leading-[18px]">Manage your organization's devices and their groupings.</p>
                    </div>
                </div>

                <div className="flex space-x-4 border-b border-[#D4C8FF]/50">
                    <button
                        onClick={() => setActiveTab('DEVICES')}
                        className={`pb-3 px-1 text-[14px] font-medium transition-colors cursor-pointer ${activeTab === 'DEVICES'
                            ? 'text-[#6466FF] border-b-2 border-[#6466FF]'
                            : 'text-[#9199A1] hover:text-[#1E1B39] border-b-2 border-transparent'
                            }`}
                    >
                        <div className="flex items-center">
                            <Laptop size={16} className="mr-2" />
                            Devices
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('GROUPS')}
                        className={`pb-3 px-1 text-[14px] font-medium transition-colors cursor-pointer ${activeTab === 'GROUPS'
                            ? 'text-[#6466FF] border-b-2 border-[#6466FF]'
                            : 'text-[#9199A1] hover:text-[#1E1B39] border-b-2 border-transparent'
                            }`}
                    >
                        <div className="flex items-center">
                            <Building2 size={16} className="mr-2" />
                            Groups
                        </div>
                    </button>
                </div>

                <div className="pt-2">
                    {activeTab === 'DEVICES' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <DevicesPage />
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <GroupsPage />
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
