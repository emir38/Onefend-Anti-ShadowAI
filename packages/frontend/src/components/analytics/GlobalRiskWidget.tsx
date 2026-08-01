import { useRiskScore } from '@/hooks/use-api';

interface GlobalRiskWidgetProps {
    startDate: Date;
    endDate: Date;
}

export default function GlobalRiskWidget({ startDate, endDate }: GlobalRiskWidgetProps) {
    const { data: score, isLoading } = useRiskScore({ startDate, endDate });
    const riskScore = Math.min(Math.max(score || 0, 0), 100);

    let label = 'SECURE';
    let arcColor = '#25C688';
    if (riskScore < 50) { label = 'CRITICAL'; arcColor = '#E22D54'; }
    else if (riskScore < 80) { label = 'MODERATE'; arcColor = '#F59E0B'; }

    // ── Figma-exact geometry ─────────────────────────────────────────
    //
    // Figma chart group: 296 × 148 px
    // The semicircle fits EXACTLY in this rectangle:
    //   - diameter = 296, so outer edge of stroke touches left & right
    //   - height = 148 = half the diameter → top of arc touches top edge
    //   - circle center is at bottom-centre (148, 148)
    //
    // strokeWidth = 20 → centreline radius = 148 - 10 = 138
    //
    // Score text "72%" is INSIDE the arc (Figma: left:61, top:49, 181×73)
    // Label "SECURE" is INSIDE the arc (Figma: left:118, top:130)

    const strokeW = 24;
    const r = 176 - strokeW / 2;  // 164 — centreline radius

    // SVG canvas: scaled up ~1.19× from Figma's 296×148
    const svgW = 352;
    const svgH = 176;
    const cx = svgW / 2;   // 176
    const cy = svgH;        // 176 — circle center at bottom of canvas

    // Single shared arc path (guarantees perfect alignment)
    const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
    const halfCirc = Math.PI * r;

    // Score dash length
    const scoreDash = (riskScore / 100) * halfCirc;

    // Dot marker tip position
    const scoreAngle = Math.PI - (riskScore / 100) * Math.PI;
    const tipX = cx + r * Math.cos(scoreAngle);
    const tipY = cy - r * Math.sin(scoreAngle);

    const dotR = 15; // dot outer radius (white ring)

    return (
        <div className="bg-white border border-[#D4C8FF]/50 shadow-sm p-[24px] h-[392px] flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0">
                <div className="flex items-center justify-between">
                    <h3 className="text-[15px] font-semibold text-[#1E1B39] leading-[19px]">Global Security Score</h3>
                    <span className="bg-[#E0E0F6] text-[#6466FF] text-[10px] font-semibold leading-[13px] px-[6px] py-[2px] rounded-full">LAST 7 DAYS</span>
                </div>
                <p className="text-[12px] font-medium text-[#A5AEB7] mt-[6px] leading-[15px]">Health score based on incident severity and frequency</p>
                <div className="border-b border-[#D4C8FF] mt-[16px]" />
            </div>

            {/* Chart — centred in space below divider */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-pulse h-20 w-20 bg-[#F0EBFF] rounded-full" />
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    {/* Wrapper sized to Figma chart group */}
                    <div className="relative" style={{ width: svgW, height: svgH }}>
                        {/* SVG arcs + dot */}
                        <svg
                            width={svgW}
                            height={svgH}
                            viewBox={`0 0 ${svgW} ${svgH}`}
                            style={{ display: 'block', overflow: 'visible' }}
                        >
                            <defs>
                                <filter id="dotShadow" x="-50%" y="-50%" width="200%" height="200%">
                                    <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="rgba(0,0,0,0.15)" />
                                </filter>
                            </defs>

                            {/* Background track — full 180° */}
                            <path
                                d={arcPath}
                                fill="none"
                                stroke="#E8EEFF"
                                strokeWidth={strokeW}
                                strokeLinecap="butt"
                            />

                            {/* Score arc — same path, clipped by dasharray */}
                            {riskScore > 0 && (
                                <path
                                    d={arcPath}
                                    fill="none"
                                    stroke={arcColor}
                                    strokeWidth={strokeW}
                                    strokeLinecap="butt"
                                    strokeDasharray={`${scoreDash} ${halfCirc}`}
                                />
                            )}

                            {/* Dot marker with shadow */}
                            {riskScore > 0 && riskScore < 100 && (
                                <g filter="url(#dotShadow)">
                                    <circle cx={tipX} cy={tipY} r={dotR} fill="white" />
                                    <circle cx={tipX} cy={tipY} r={dotR - 4} fill={arcColor} />
                                </g>
                            )}
                        </svg>

                        {/* Score number — INSIDE the arc, centred */}
                        <div
                            className="absolute flex items-center justify-center"
                            style={{ left: 72, top: 58, width: 215, height: 87 }}
                        >
                            <span
                                className="text-[#1E1B39] text-center"
                                style={{ fontSize: '65px', fontWeight: 700, lineHeight: '87px' }}
                            >
                                {riskScore}%
                            </span>
                        </div>

                        {/* Label — INSIDE the arc, centred */}
                        <div
                            className="absolute left-0 w-full flex justify-center"
                            style={{ top: 155 }}
                        >
                            <span className="text-[16px] font-medium text-[#1E1B39] leading-[20px]">
                                {label}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
