'use client';

import ProtectedRoute from '@/components/protected-route';
import {
    useConversationStats,
    useTopUsers,
    useTopApps,
    useTimeline,
} from '@/hooks/use-api';
import TopUsersChart from '@/components/charts/TopUsersChart';
import TopAppsChart from '@/components/charts/TopAppsChart';
import RiskDistributionChart from '@/components/charts/RiskDistributionChart';
import ActionDistributionChart from '@/components/charts/ActionDistributionChart';
import TimelineChart from '@/components/charts/TimelineChart';
import GlobalRiskWidget from '@/components/analytics/GlobalRiskWidget';
import TopPatternsWidget from '@/components/analytics/TopPatternsWidget';
import ReportExportModal from '@/components/analytics/ReportExportModal';
import AlertsConfigModal from '@/components/analytics/AlertsConfigModal';
import ReportScheduleModal from '@/components/analytics/ReportScheduleModal';
import {
    StatEventsIcon,
    StatHighRiskIcon,
    StatDataIcon,
    StatBlockedIcon,
} from '@/components/card-icons';
import { useState, useMemo } from 'react';
import {
    Bell,
    Calendar,
} from 'lucide-react';

type DateRange = '7d' | '30d' | 'custom';

export default function AnalyticsPage() {
    const [dateRange, setDateRange] = useState<DateRange>('7d');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [platformFilter, setPlatformFilter] = useState('ALL');
    const [riskFilter, setRiskFilter] = useState('ALL');
    const [actionFilter, setActionFilter] = useState('ALL');
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

    // Calculate date range
    const { startDate, endDate } = useMemo(() => {
        const end = new Date();
        const start = new Date();

        if (dateRange === '7d') {
            start.setDate(start.getDate() - 7);
        } else if (dateRange === '30d') {
            start.setDate(start.getDate() - 30);
        } else if (dateRange === 'custom' && customStartDate && customEndDate) {
            return {
                startDate: new Date(customStartDate),
                endDate: new Date(customEndDate),
            };
        }

        return { startDate: start, endDate: end };
    }, [dateRange, customStartDate, customEndDate]);

    // Build filter params
    const filterParams = useMemo(() => {
        const params: any = {};
        if (platformFilter !== 'ALL') params.platform = platformFilter;
        if (riskFilter !== 'ALL') params.riskLevel = riskFilter;
        if (actionFilter !== 'ALL') params.action = actionFilter;
        return params;
    }, [platformFilter, riskFilter, actionFilter]);

    // Fetch all analytics data with filters applied
    const { data: stats, isLoading: statsLoading } = useConversationStats({
        startDate,
        endDate,
        ...filterParams
    });

    const { data: topUsers, isLoading: topUsersLoading } = useTopUsers({
        startDate,
        endDate,
        limit: 5,
        ...filterParams
    });

    const { data: topApps, isLoading: topAppsLoading } = useTopApps({
        startDate,
        endDate,
        limit: 5,
        ...filterParams
    });

    // Timeline for last 24 hours (with filters)
    const timelineRange = useMemo(() => {
        const end = new Date();
        const start = new Date();
        start.setHours(start.getHours() - 24);
        return { startDate: start, endDate: end };
    }, []);

    const { data: timeline, isLoading: timelineLoading } = useTimeline({
        ...timelineRange,
        interval: 'hour',
        ...filterParams
    });

    // Fetch ALL platforms (without filters) for the dropdown
    const { data: allStats } = useConversationStats({
        startDate,
        endDate
        // NO filters here - we want ALL platforms
    });

    const isLoading = statsLoading || topUsersLoading || topAppsLoading || timelineLoading;

    // Get unique platforms from ALL stats (not filtered)
    const platforms = allStats?.byPlatform?.map((p: any) => p.platform) || [];

    const clearFilters = () => {
        setPlatformFilter('ALL');
        setRiskFilter('ALL');
        setActionFilter('ALL');
    };

    return (
        <ProtectedRoute>
            <div className="flex flex-col min-h-full pl-[21px] pr-[24px] py-[24px] gap-[20px]">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between bg-white border border-[#D4C8FF]/50 px-[25px] py-[32px] gap-4">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-[24px] font-semibold text-[#1E1B39] tracking-tight leading-[30px]">Analytics Dashboard</h1>
                        <p className="text-[14px] font-medium text-[#A5AEB7] leading-[18px]">
                            Comprehensive insights into your organization&apos;s AI and SaaS usage
                        </p>
                    </div>

                    {/* Actions row: date filter FIRST, then Alerts / Schedule / Export */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Date range selector — leftmost */}
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value as DateRange)}
                            className="bg-transparent text-[#6466FF] px-4 py-2.5 text-[14px] font-medium border border-[#6466FF] focus:outline-none focus:ring-1 focus:ring-[#6466FF] cursor-pointer h-[48px]"
                        >
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="custom">Custom Range</option>
                        </select>
                        {dateRange === 'custom' && (
                            <>
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="bg-white text-[#1E1B39] px-4 py-2.5 text-[14px] border border-[#D4C8FF]/50 focus:outline-none focus:ring-1 focus:ring-[#6466FF] [color-scheme:light]"
                                />
                                <span className="text-[14px] text-[#A5AEB7] font-medium">to</span>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="bg-white text-[#1E1B39] px-4 py-2.5 text-[14px] border border-[#D4C8FF]/50 focus:outline-none focus:ring-1 focus:ring-[#6466FF] [color-scheme:light]"
                                />
                            </>
                        )}
                        {/* Alerts button */}
                        <button
                            onClick={() => setIsAlertsModalOpen(true)}
                            className="bg-transparent text-[#6466FF] border border-[#6466FF] hover:bg-[#6466FF]/10 px-[16px] py-[15px] text-[14px] font-medium flex items-center gap-[6px] transition-colors h-[48px]"
                        >
                            <Bell size={16} /> Alerts
                        </button>
                        {/* Schedule button */}
                            <button
                                onClick={() => setIsScheduleModalOpen(true)}
                                className="bg-transparent text-[#6466FF] border border-[#6466FF] hover:bg-[#6466FF]/10 px-[16px] py-[15px] text-[14px] font-medium flex items-center gap-[6px] transition-colors h-[48px]"
                            >
                                <Calendar size={16} /> Schedule
                            </button>
                        {/* Export Report button */}
                        <button
                            onClick={() => setIsExportModalOpen(true)}
                            className="bg-[#6466FF] text-white hover:bg-[#5557E0] px-[16px] py-[15px] text-[14px] font-medium flex items-center gap-[6px] transition-colors h-[48px]"
                        >
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M14.25 11.25V14.25H3.75V11.25H2.25V14.25C2.25 15.075 2.925 15.75 3.75 15.75H14.25C15.075 15.75 15.75 15.075 15.75 14.25V11.25H14.25ZM12.75 8.25L11.6925 7.1925L9.75 9.1275V2.25H8.25V9.1275L6.3075 7.1925L5.25 8.25L9 12L12.75 8.25Z" fill="currentColor" />
                            </svg>
                            Export Report
                        </button>
                    </div>
                </div>

                {/* Advanced Filters */}
                <div className="bg-white p-6 border border-[#D4C8FF]/50 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[15px] font-semibold text-[#1E1B39]">Filters</h3>
                        <button
                            onClick={clearFilters}
                            className="text-[14px] text-[#6466FF] hover:text-[#5557E0] font-medium cursor-pointer"
                        >
                            Clear All
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                            <label className="block text-[13px] font-semibold text-[#A5AEB7] mb-[10px]">Platform</label>
                            <select
                                value={platformFilter}
                                onChange={(e) => setPlatformFilter(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-[#D4C8FF]/50 text-[#1E1B39] text-[14px] focus:outline-none focus:ring-1 focus:ring-[#6466FF] cursor-pointer h-[36px] py-0"
                            >
                                <option value="ALL">All platforms</option>
                                {platforms.map((platform: string) => (
                                    <option key={platform} value={platform}>{platform}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[13px] font-semibold text-[#A5AEB7] mb-[10px]">Risk Levels</label>
                            <select
                                value={riskFilter}
                                onChange={(e) => setRiskFilter(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-[#D4C8FF]/50 text-[#1E1B39] text-[14px] focus:outline-none focus:ring-1 focus:ring-[#6466FF] cursor-pointer h-[36px] py-0"
                            >
                                <option value="ALL">All levels</option>
                                <option value="HIGH">High Risk</option>
                                <option value="MEDIUM">Medium Risk</option>
                                <option value="LOW">Low Risk</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[13px] font-semibold text-[#A5AEB7] mb-[10px]">Action</label>
                            <select
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-[#D4C8FF]/50 text-[#1E1B39] text-[14px] focus:outline-none focus:ring-1 focus:ring-[#6466FF] cursor-pointer h-[36px] py-0"
                            >
                                <option value="ALL">All actions</option>
                                <option value="BLOCK">Blocked</option>
                                <option value="WARN">Warned</option>
                                <option value="LOG">Logged</option>
                            </select>
                        </div>
                    </div>
                    {(platformFilter !== 'ALL' || riskFilter !== 'ALL' || actionFilter !== 'ALL') && (
                        <div className="mt-3 text-xs text-muted-foreground">
                            <span className="font-medium">Active filters:</span>
                            {platformFilter !== 'ALL' && <span className="ml-2 px-2 py-1 bg-secondary text-secondary-foreground rounded-[4px]">{platformFilter}</span>}
                            {riskFilter !== 'ALL' && <span className="ml-2 px-2 py-1 bg-secondary text-secondary-foreground rounded-[4px]">{riskFilter}</span>}
                            {actionFilter !== 'ALL' && <span className="ml-2 px-2 py-1 bg-secondary text-secondary-foreground rounded-[4px]">{actionFilter}</span>}
                        </div>
                    )}
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard
                        title="Total Events"
                        value={stats?.totalEvents || 0}
                        isLoading={statsLoading}
                        icon={StatEventsIcon}
                        iconBg="bg-[#E0E0F6]"
                        iconFg="text-[#6466FF]"
                    />
                    <StatCard
                        title="Sensitive Data Detected"
                        value={stats?.sensitiveDataDetected || 0}
                        isLoading={statsLoading}
                        icon={StatDataIcon}
                        iconBg="bg-[#31CAEC]/[0.13]"
                        iconFg="text-[#31CAEC]"
                    />
                    <StatCard
                        title="High Risk Events"
                        value={stats?.byRiskLevel?.find((r: any) => r.riskLevel === 'HIGH')?._count || 0}
                        isLoading={statsLoading}
                        icon={StatHighRiskIcon}
                        iconBg="bg-[#E22D54]/[0.13]"
                        iconFg="text-[#E22D54]"
                    />
                    <StatCard
                        title="Blocked Events"
                        value={stats?.byAction?.find((a: any) => a.action === 'BLOCK')?._count || 0}
                        isLoading={statsLoading}
                        icon={StatBlockedIcon}
                        iconBg="bg-[#25C688]/[0.13]"
                        iconFg="text-[#25C688]"
                    />
                </div>

                {/* Executive Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                        <GlobalRiskWidget startDate={startDate} endDate={endDate} />
                    </div>
                    <div className="md:col-span-2">
                        <TopPatternsWidget startDate={startDate} endDate={endDate} />
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Users */}
                    {topUsersLoading ? (
                        <LoadingCard />
                    ) : (
                        <TopUsersChart data={topUsers || []} />
                    )}

                    {/* Top Apps */}
                    {topAppsLoading ? (
                        <LoadingCard />
                    ) : (
                        <TopAppsChart data={topApps || []} />
                    )}

                    {/* Risk Distribution */}
                    {statsLoading ? (
                        <LoadingCard />
                    ) : (
                        <RiskDistributionChart data={stats?.byRiskLevel || []} />
                    )}

                    {/* Action Distribution */}
                    {statsLoading ? (
                        <LoadingCard />
                    ) : (
                        <ActionDistributionChart data={stats?.byAction || []} />
                    )}
                </div>

                {/* Timeline Chart (Full Width) */}
                {timelineLoading ? (
                    <LoadingCard height="h-[450px]" />
                ) : (
                    <TimelineChart data={timeline || []} />
                )}

                {/* Access Vectors (Platform Breakdown) */}
                {!statsLoading && stats?.byPlatform && stats.byPlatform.length > 0 && (
                    <div className="bg-white p-[24px] border border-[#D4C8FF]/50 shadow-sm">
                        <div className="mb-[16px]">
                            <h3 className="text-[15px] font-semibold text-[#1E1B39]">Access Vectors</h3>
                            <p className="text-[12px] font-medium text-[#A5AEB7] mt-1">Distribution of AI usage by client interface type. Helps identify shadow IT and unmanaged access points.</p>
                            <div className="border-b border-[#D4C8FF] mt-[16px]" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            {stats.byPlatform.map((platform: any) => {
                                let label = platform.platform;
                                let desc = 'Unknown source';

                                const p = platform.platform.toLowerCase();
                                if (p.includes('browser') || p.includes('web')) {
                                    label = 'Web Console';
                                    desc = 'Direct web access (High Risk)';
                                } else if (p.includes('mobile') || p.includes('ios') || p.includes('android')) {
                                    label = 'Mobile App';
                                    desc = 'Mobile device usage';
                                } else if (p.includes('code') || p.includes('intellij') || p.includes('visual')) {
                                    label = 'IDE Extension';
                                    desc = 'Developer tools';
                                } else if (p.includes('slack') || p.includes('teams') || p.includes('discord')) {
                                    label = 'Chat Integration';
                                    desc = 'Collaboration tools';
                                } else if (p.includes('api') || p.includes('curl')) {
                                    label = 'API / CLI';
                                    desc = 'Automated access';
                                }

                                return (
                                    <div key={platform.platform} className="bg-[#FAF7FF] p-[16px] border border-[#D4C8FF]/50 hover:bg-[#F6F0FF] transition-colors">
                                        <div className="text-[24px] font-bold text-[#1E1B39] leading-[30px] mb-[4px]">{platform._count}</div>
                                        <div className="text-[14px] font-semibold text-[#1E1B39] leading-[18px] mb-[2px]">{label}</div>
                                        <div className="text-[12px] font-medium text-[#A5AEB7] leading-[15px]">{desc}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <ReportExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                defaultStartDate={startDate}
                defaultEndDate={endDate}
                filters={filterParams}
            />

            <AlertsConfigModal
                isOpen={isAlertsModalOpen}
                onClose={() => setIsAlertsModalOpen(false)}
            />

            <ReportScheduleModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
            />

        </ProtectedRoute >
    );
}

function StatCard({
    title,
    value,
    isLoading,
    icon: Icon,
    iconBg,
    iconFg,
}: {
    title: string;
    value: number;
    isLoading: boolean;
    icon: React.ElementType;
    iconBg: string;
    iconFg?: string;
}) {
    return (
        <div className="bg-white h-[107px] px-[22px] py-[26px] border border-[#D4C8FF]/50 flex items-center justify-start shadow-sm flex-shrink-0 transition-shadow hover:shadow-md">
            <div className={`w-[53px] h-[53px] rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                <Icon className={`h-[26px] w-[26px] ${iconFg || 'text-white'}`} />
            </div>
            <div className="flex flex-col ml-[14px] h-[51px] justify-between">
                <h4 className="text-[14px] font-semibold text-[#A5AEB7] leading-[18px]">{title}</h4>
                <span className="text-[24px] font-bold text-[#1E1B39] leading-[30px]">
                    {isLoading ? '...' : value.toLocaleString()}
                </span>
            </div>
        </div>
    );
}

function LoadingCard({ height = 'h-[350px]' }: { height?: string }) {
    return (
        <div className={`bg-white border border-[#D4C8FF]/50 shadow-sm ${height} flex items-center justify-center`}>
            <div className="text-[#A5AEB7]">Loading...</div>
        </div>
    );
}
