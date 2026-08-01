import React from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { UserIcon } from '@/components/custom-icons';

interface UserStat {
    userId: string;
    email: string;
    count: number;
}

interface ViolatorsTableProps {
    violators: UserStat[];
    heroes: UserStat[];
}

export const ViolatorsTable: React.FC<ViolatorsTableProps> = ({ violators, heroes }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#D4C8FF]/50 p-[24px] shadow-sm flex flex-col">
                <div className="mb-[40px] flex gap-[20px]">
                    <div className="w-[39px] h-[39px] rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(226, 45, 84, 0.13)' }}>
                        <ShieldAlert className="h-[24px] w-[24px] text-[#E22D54]" />
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-[15px] font-semibold text-[#1E1B39] leading-[19px]">High Risk Users</h3>
                        <p className="text-[12px] font-medium text-[#A5AEB7] leading-[15px] mt-[5px]">Users with most high-risk blocks</p>
                    </div>
                </div>
                <div className="flex flex-col gap-0">
                    {violators.map((user, i) => (
                        <div key={user.userId} className="flex border-t border-[#D4C8FF] border-opacity-100 py-[11px] items-center first:border-none">
                            <span className="text-[13px] font-medium text-[#A5AEB7] leading-[22px] w-[28px]">
                                {String(i + 1).padStart(2, '0')}
                            </span>
                            <div className="w-[34px] h-[34px] rounded-[41px] flex items-center justify-center flex-shrink-0 ml-[0px]" style={{ backgroundColor: 'rgba(226, 45, 84, 0.13)' }}>
                                <UserIcon className="h-[25px] w-[25px] text-[#E22D54]" />
                            </div>
                            <div className="flex flex-col ml-[14px]">
                                <span className="text-[15px] font-medium text-[#1E1B39] leading-[19px]">{user.email.split('@')[0]}</span>
                                <span className="text-[12px] font-medium text-[#A5AEB7] leading-[15px] mt-[5px]">ID: {user.userId}</span>
                            </div>
                            <div className="ml-auto flex items-center justify-center h-[17px] px-[8px] bg-white border border-[#E22D54]/13" style={{ backgroundColor: 'rgba(226, 45, 84, 0.13)', borderRadius: '45px' }}>
                                <span className="text-[#E22D54] text-[10px] font-semibold leading-[13px] tracking-tight uppercase">
                                    {user.count} BLOCKS
                                </span>
                            </div>
                        </div>
                    ))}
                    {violators.length === 0 && (
                        <div className="text-center text-[14px] text-[#A5AEB7] py-8 border-t border-[#D4C8FF]/50">
                            No recent violations
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white border border-[#D4C8FF]/50 p-[24px] shadow-sm flex flex-col">
                <div className="mb-[40px] flex gap-[20px]">
                    <div className="w-[39px] h-[39px] rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(37, 198, 136, 0.13)' }}>
                        <ShieldCheck className="h-[24px] w-[24px] text-[#25C688]" />
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-[15px] font-semibold text-[#1E1B39] leading-[19px]">Security Heroes</h3>
                        <p className="text-[12px] font-medium text-[#A5AEB7] leading-[15px] mt-[5px]">Most alerts received with 0 bypasses</p>
                    </div>
                </div>
                <div className="flex flex-col gap-0">
                    {heroes.map((user, i) => (
                        <div key={user.userId} className="flex border-t border-[#D4C8FF] border-opacity-100 py-[11px] items-center first:border-none">
                            <span className="text-[13px] font-medium text-[#A5AEB7] leading-[22px] w-[28px]">
                                {String(i + 1).padStart(2, '0')}
                            </span>
                            <div className="w-[34px] h-[34px] rounded-[41px] flex items-center justify-center flex-shrink-0 ml-[0px]" style={{ backgroundColor: 'rgba(37, 198, 136, 0.13)' }}>
                                <UserIcon className="h-[25px] w-[25px] text-[#25C688]" />
                            </div>
                            <div className="flex flex-col ml-[14px]">
                                <span className="text-[15px] font-medium text-[#1E1B39] leading-[19px]">{user.email.split('@')[0]}</span>
                                <span className="text-[12px] font-medium text-[#A5AEB7] leading-[15px] mt-[5px]">ID: {user.userId}</span>
                            </div>
                            <div className="ml-auto flex items-center justify-center h-[17px] px-[8px] bg-white border border-[#25C688]/13" style={{ backgroundColor: 'rgba(37, 198, 136, 0.13)', borderRadius: '45px' }}>
                                <span className="text-[#25C688] text-[10px] font-semibold leading-[13px] tracking-tight uppercase">
                                    {user.count} SAFE ACTS
                                </span>
                            </div>
                        </div>
                    ))}
                    {heroes.length === 0 && (
                        <div className="text-center text-[14px] text-[#A5AEB7] py-8 border-t border-[#D4C8FF]/50">
                            No security champions yet
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
