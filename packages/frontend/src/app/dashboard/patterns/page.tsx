import { PatternList } from '@/components/patterns/PatternList';

export default function PatternsPage() {
    return (
        <div className="flex flex-col min-h-full pl-[21px] pr-[24px] py-[24px] gap-[20px]">
            <div className="flex justify-between items-center bg-card border border-[#D4C8FF]/50 px-[25px] py-[32px]">
                <div className="flex flex-col gap-2">
                    <h1 className="text-[24px] font-semibold text-foreground tracking-tight leading-[30px]">Detection Patterns</h1>
                    <p className="text-[14px] font-medium text-muted-foreground leading-[18px]">
                        Manage sensitive data detection patterns. Built-in patterns are maintained by the system, while custom patterns allow you to detect specific organization secrets.
                    </p>
                </div>
            </div>

            <PatternList />
        </div>
    );
}
