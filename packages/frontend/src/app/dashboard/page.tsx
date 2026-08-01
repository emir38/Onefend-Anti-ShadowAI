'use client';

import ProtectedRoute from '@/components/protected-route';
import { useAuth } from '@/contexts/auth-context';
import { useConversationStats, useConversationTrends, useApplications } from '@/hooks/use-api';
import TrendChart from '@/components/charts/TrendChart';
import { useMemo } from 'react';
import { BarChart3, AlertOctagon, AppWindow, Shield, Activity, Lock, Settings } from 'lucide-react';
import { StatEventsIcon, StatHighRiskIcon, StatAppsIcon, StatDataIcon } from '@/components/card-icons';
import { ApplicationsIcon, PoliciesIcon, EventsIcon } from '@/components/custom-icons';
import { RiskHeatmap } from '@/components/charts/RiskHeatmap';
import { ViolatorsTable } from '@/components/tables/ViolatorsTable';
import { cn } from '@/lib/utils'; // Try to use if available, otherwise remove
import { useAnalyticsHeatmap, useAnalyticsRiskUsers, useAnalyticsHeroes } from '@/hooks/use-api-analytics';

export default function DashboardPage() {
    const { user } = useAuth();

    // Calculate date range (last 7 days)
    const dateRange = useMemo(() => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        return { startDate, endDate };
    }, []);

    // Fetch stats and trends
    const { data: stats, isLoading: statsLoading } = useConversationStats(dateRange);
    const { data: trends, isLoading: trendsLoading } = useConversationTrends({
        ...dateRange,
        groupBy: 'day',
    });
    const { data: appsData } = useApplications({ limit: 1000 }); // Get all apps for count

    // Calculate metrics
    const totalEvents = stats?.totalEvents || 0;
    const highRiskEvents = stats?.byRiskLevel?.find((r: any) => r.riskLevel === 'HIGH')?._count || 0;
    const sensitiveDataDetected = stats?.sensitiveDataDetected || 0;
    const totalApps = appsData?.meta?.total || 0;

    // Fetch Analytics Data (Realtime)
    const { data: rawHeatmap } = useAnalyticsHeatmap();
    const { data: violators } = useAnalyticsRiskUsers();
    const { data: heroes } = useAnalyticsHeroes();

    // Transform Backend Data for Heatmap
    const heatmapData = useMemo(() => {
        if (!rawHeatmap) return [];
        return rawHeatmap.map((item: any) => ({
            category: item.category,
            riskLevel: item.risk as 'LOW' | 'MEDIUM' | 'HIGH',
            count: item.value,
        }));
    }, [rawHeatmap]);

    const violatorsData = violators || [];
    const heroesData = heroes || [];

    const handleExport = () => {
        // Mock export
        alert('Downloading Executive Report (PDF)...');
    };

    return (
        <ProtectedRoute>
            <div className="flex flex-col min-h-full pl-[21px] pr-[24px] py-[24px] gap-[20px]">
                {/* Page Header — edge to edge white bar, pl-[25px] matches Figma internal padding */}
                <div className="flex justify-between items-center bg-white border border-[#D4C8FF]/50 px-[25px] py-[32px]">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-[24px] font-semibold text-[#1E1B39] leading-[30px]">Dashboard Overview</h1>
                        <p className="text-[14px] font-medium text-[#A5AEB7] leading-[18px]">
                            Real-time monitoring of security events and shadow AI usage across your organization.
                        </p>
                    </div>
                    <div className="flex items-center gap-6">
                        <span className="text-[14px] font-medium text-[#9199A1] whitespace-nowrap">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        <button
                            onClick={handleExport}
                            className="bg-[#6466FF] text-[#FFFFFF] hover:bg-[#5557E0] px-[16px] py-[15px] flex items-center justify-center gap-[6px] text-[14px] font-medium transition-colors w-[150px] h-[48px]"
                        >
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M14.25 11.25V14.25H3.75V11.25H2.25V14.25C2.25 15.075 2.925 15.75 3.75 15.75H14.25C15.075 15.75 15.75 15.075 15.75 14.25V11.25H14.25ZM12.75 8.25L11.6925 7.1925L9.75 9.1275V2.25H8.25V9.1275L6.3075 7.1925L5.25 8.25L9 12L12.75 8.25Z" fill="currentColor" />
                            </svg>
                            Export Report
                        </button>
                    </div>
                </div>
                {/* Page Content */}
                <div className="flex flex-col gap-[20px]">




                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            title="Total Events"
                            value={statsLoading ? '...' : totalEvents.toString()}
                            icon={StatEventsIcon}
                            iconBg="bg-[#E0E0F6]"
                            iconFg="text-[#6466FF]"
                            badgeText="LAST 7 DAYS"
                            badgeBg="bg-[#E0E0F6]"
                            badgeColor="text-[#6466FF]"
                        />
                        <StatCard
                            title="High Risk Events"
                            value={statsLoading ? '...' : highRiskEvents.toString()}
                            icon={StatHighRiskIcon}
                            iconBg="bg-[#E22D54]/[0.13]"
                            iconFg="text-[#E22D54]"
                            badgeText={highRiskEvents > 0 ? "REQUIRES ATTENTION" : "ALL CLEAR"}
                            badgeBg="bg-[#E22D54]/[0.13]"
                            badgeColor="text-[#E22D54]"
                        />
                        <StatCard
                            title="Applications Detected"
                            value={totalApps.toString()}
                            icon={StatAppsIcon}
                            iconBg="bg-[#25C688]/[0.13]"
                            iconFg="text-[#25C688]"
                            badgeText="TOTAL REGISTERED"
                            badgeBg="bg-[#25C688]/[0.13]"
                            badgeColor="text-[#25C688]"
                        />
                        <StatCard
                            title="Sensitive Data Detected"
                            value={statsLoading ? '...' : sensitiveDataDetected.toString()}
                            icon={StatDataIcon}
                            iconBg="bg-[#31CAEC]/[0.13]"
                            iconFg="text-[#31CAEC]"
                            badgeText="LAST 7 DAYS"
                            badgeBg="bg-[#31CAEC]/[0.13]"
                            badgeColor="text-[#31CAEC]"
                        />
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white border border-[#D4C8FF]/50 p-[24px] shadow-sm">
                        <h3 className="text-[14px] font-semibold text-[#1E1B39] mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-[#D4C8FF]/50">
                            <ActionButton
                                href="/dashboard/applications"
                                title="Manage Applications"
                                description="View and categorize SaaS Applications"
                                icon={ApplicationsIcon}
                            />
                            <ActionButton
                                href="/dashboard/policies"
                                title="Configure Policies"
                                description="Set access rules and restrictions"
                                icon={PoliciesIcon}
                            />
                            <ActionButton
                                href="/dashboard/events"
                                title="View Events"
                                description="Monitor user activity and compliance"
                                icon={EventsIcon}
                            />
                        </div>
                    </div>

                    {/* New Visualizations Row 1: Heatmap */}
                    <div className="grid grid-cols-1">
                        <RiskHeatmap data={heatmapData} />
                    </div>

                    {/* New Visualizations Row 2: Violators & Heroes */}
                    <ViolatorsTable violators={violatorsData} heroes={heroesData} />

                    {/* Trend Chart */}
                    {trendsLoading ? (
                        <div className="bg-white border border-[#D4C8FF]/50 p-6 h-[330px] flex items-center justify-center shadow-sm">
                            <div className="text-[#9199A1]">Loading trend data...</div>
                        </div>
                    ) : trends && trends.length > 0 ? (
                        <TrendChart data={trends} />
                    ) : (
                        <div className="bg-white border border-[#D4C8FF]/50 p-6 h-[330px] flex items-center justify-center shadow-sm">
                            <div className="text-[#9199A1]">No event data available for the last 7 days</div>
                        </div>
                    )}



                    {/* Recent Activity Summary */}
                    <div className="bg-white border border-[#D4C8FF]/50 p-6 shadow-sm">
                        <h3 className="text-[14px] font-semibold text-[#1E1B39] mb-4">Activity Summary</h3>
                        {statsLoading ? (
                            <div className="text-[#9199A1] text-center py-8">Loading...</div>
                        ) : stats && stats.byAction ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {stats.byAction.map((item: any) => (
                                    <div key={item.action} className="bg-[#FAF7FF] p-5 border border-[#D4C8FF]/50 hover:border-[#6466FF]/20 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[14px] text-[#1E1B39] font-medium">{item.action}</span>
                                            <span className={`text-[28px] font-bold ${getActionColor(item.action)} leading-none`}>
                                                {item._count}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-[#9199A1] text-center py-8">
                                No recent activity to display
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}

function StatCard({
    title,
    value,
    icon: Icon,
    iconBg,
    iconFg,
    badgeBg,
    badgeColor,
    badgeText,
}: {
    title: string;
    value: string;
    icon: React.ElementType;
    iconBg: string;
    iconFg: string;
    badgeBg?: string;
    badgeColor?: string;
    badgeText?: string;
}) {
    return (
        <div className="bg-white h-[107px] px-[22px] py-[26px] border border-[#D4C8FF]/50 flex items-center justify-start shadow-sm flex-shrink-0 transition-shadow hover:shadow-md">
            <div className={`w-[53px] h-[53px] rounded-[13px] flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                <Icon className={`h-[26px] w-[26px] ${iconFg}`} />
            </div>

            <div className="flex flex-col ml-[14px] h-[51px] justify-between">
                <h4 className="text-[14px] font-semibold text-[#A5AEB7] leading-[18px]">{title}</h4>
                <div className="flex items-center gap-[12px]">
                    <span className="text-[24px] font-bold text-[#1E1B39] leading-[30px]">{value}</span>
                    {badgeText && (
                        <div className={`px-[9px] py-[2px] rounded-[45px] text-[10px] font-semibold leading-[13px] ${badgeBg} ${badgeColor} uppercase tracking-tight`}>
                            {badgeText}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ActionButton({
    href,
    title,
    description,
    icon: Icon,
}: {
    href: string;
    title: string;
    description: string;
    icon: React.ElementType;
}) {
    return (
        <a
            href={href}
            className="group flex items-center gap-[13px] py-[10px] px-[20px] bg-white hover:bg-[#FAF7FF] transition-all duration-200"
        >
            {/* Icon circle: light gray bg matching Figma, icon dark */}
            <div className="w-[39px] h-[39px] rounded-full bg-[#E8E8EE] flex items-center justify-center flex-shrink-0 group-hover:bg-[#6466FF] transition-colors">
                <Icon className="h-[22px] w-[22px] text-[#1E1B39] group-hover:text-white transition-colors" />
            </div>
            {/* Text stack */}
            <div className="flex flex-col">
                <span className="text-[15px] font-medium text-[#1E1B39] leading-[19px] group-hover:text-[#6466FF] transition-colors">{title}</span>
                <span className="text-[12px] font-medium text-[#A5AEB7] leading-[15px] mt-[4px]">{description}</span>
            </div>
        </a>
    );
}

function getActionColor(action: string): string {
    switch (action) {
        case 'BLOCK':
            return 'text-destructive';
        case 'WARN':
            return 'text-amber-500';
        case 'LOG':
            return 'text-primary';
        default:
            return 'text-muted-foreground';
    }
}
