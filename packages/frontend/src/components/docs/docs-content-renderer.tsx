import type { DocBlock, CalloutVariant } from '@/lib/docs/types';

// ─── Callout SVG icons ────────────────────────────────────────────────────────

function CalloutIcon({ variant, color }: { variant: CalloutVariant; color: string }) {
  const props = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (variant) {
    case 'info':
      return <svg {...props}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>;
    case 'tip':
      return <svg {...props}><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 1 4 12.9V17H8v-2.1A7 7 0 0 1 12 2z" /></svg>;
    case 'warning':
      return <svg {...props}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
    case 'danger':
      return <svg {...props}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>;
  }
}

const calloutConfig: Record<CalloutVariant, { bg: string; border: string; iconColor: string; labelColor: string }> = {
  info: {
    bg: 'rgba(100,102,255,0.06)',
    border: 'rgba(100,102,255,0.2)',
    iconColor: '#6466FF',
    labelColor: '#6466FF',
  },
  tip: {
    bg: 'rgba(100,102,255,0.06)',
    border: 'rgba(100,102,255,0.2)',
    iconColor: '#6466FF',
    labelColor: '#6466FF',
  },
  warning: {
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.2)',
    iconColor: '#D97706',
    labelColor: '#D97706',
  },
  danger: {
    bg: 'rgba(226,45,84,0.06)',
    border: 'rgba(226,45,84,0.2)',
    iconColor: '#E22D54',
    labelColor: '#E22D54',
  },
};

const variantLabel: Record<CalloutVariant, string> = {
  info: 'Información',
  tip: 'Consejo',
  warning: 'Atención',
  danger: 'Peligro',
};

// ─── Content Renderer ─────────────────────────────────────────────────────────

interface ContentRendererProps {
  blocks: DocBlock[];
}

export default function ContentRenderer({ blocks }: ContentRendererProps) {
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {blocks.map((block, i) => (
        <BlockRenderer key={i} block={block} />
      ))}
    </div>
  );
}

function BlockRenderer({ block }: { block: DocBlock }) {
  switch (block.type) {

    case 'h2':
      return (
        <h2
          id={block.id}
          style={{
            fontSize: '22px', fontWeight: 700, color: '#1E1B39',
            margin: '40px 0 16px', lineHeight: '30px',
            scrollMarginTop: '80px',
            paddingBottom: '10px',
            borderBottom: '1px solid rgba(212,200,255,0.4)',
          }}
        >
          {block.text}
        </h2>
      );

    case 'h3':
      return (
        <h3
          id={block.id}
          style={{
            fontSize: '16px', fontWeight: 700, color: '#1E1B39',
            margin: '28px 0 12px', lineHeight: '24px',
            scrollMarginTop: '80px',
          }}
        >
          {block.text}
        </h3>
      );

    case 'p':
      return (
        <p style={{
          fontSize: '15px', color: '#3D3A5C', lineHeight: '1.8',
          margin: '0 0 16px',
        }}>
          {block.text}
        </p>
      );

    case 'callout': {
      const cfg = calloutConfig[block.variant];
      return (
        <div style={{
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          borderLeft: `3px solid ${cfg.iconColor}`,
          borderRadius: '4px',
          padding: '16px 20px',
          margin: '24px 0',
        }}>
          {block.title && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              marginBottom: '6px',
            }}>
              <CalloutIcon variant={block.variant} color={cfg.iconColor} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: cfg.labelColor }}>
                {block.title}
              </span>
            </div>
          )}
          {!block.title && (
            <span style={{ fontSize: '13px', fontWeight: 700, color: cfg.labelColor, marginRight: '8px' }}>
              {variantLabel[block.variant]}:
            </span>
          )}
          <p style={{
            fontSize: '14px', color: '#3D3A5C', lineHeight: '1.7',
            margin: block.title ? '0' : '0',
            display: block.title ? 'block' : 'inline',
          }}>
            {block.text}
          </p>
        </div>
      );
    }

    case 'code':
      return (
        <div style={{ margin: '24px 0' }}>
          {block.filename && (
            <div style={{
              background: '#1E1B39', borderRadius: '6px 6px 0 0',
              padding: '8px 16px',
              fontSize: '12px', color: 'rgba(255,255,255,0.5)',
              fontFamily: 'monospace',
            }}>
              {block.filename}
            </div>
          )}
          <pre style={{
            background: '#18191A',
            borderRadius: block.filename ? '0 0 6px 6px' : '6px',
            padding: '20px',
            overflowX: 'auto',
            margin: 0,
          }}>
            <code style={{
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
              fontSize: '13px',
              color: '#A5D6FF',
              lineHeight: '1.6',
            }}>
              {block.code}
            </code>
          </pre>
        </div>
      );

    case 'list':
      return (
        <div style={{ margin: '0 0 20px' }}>
          {block.ordered ? (
            <ol style={{
              margin: 0, paddingLeft: '24px',
              color: '#3D3A5C', fontSize: '15px', lineHeight: '1.8',
            }}>
              {block.items.map((item, i) => (
                <li key={i} style={{ marginBottom: '6px' }}>{item}</li>
              ))}
            </ol>
          ) : (
            <ul style={{
              margin: 0, paddingLeft: '20px',
              color: '#3D3A5C', fontSize: '15px', lineHeight: '1.8',
            }}>
              {block.items.map((item, i) => (
                <li key={i} style={{ marginBottom: '6px' }}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      );

    case 'table':
      return (
        <div style={{ margin: '24px 0', overflowX: 'auto' }}>
          <table style={{
            width: '100%', borderCollapse: 'collapse',
            fontSize: '14px', color: '#3D3A5C',
          }}>
            <thead>
              <tr style={{ background: 'rgba(100,102,255,0.06)' }}>
                {block.headers.map((h) => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left',
                    fontWeight: 700, color: '#1E1B39',
                    borderBottom: '2px solid rgba(212,200,255,0.4)',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr
                  key={i}
                  style={{ background: i % 2 === 0 ? '#fff' : 'rgba(248,247,255,0.8)' }}
                >
                  {row.map((cell, j) => (
                    <td key={j} style={{
                      padding: '10px 16px',
                      borderBottom: '1px solid rgba(212,200,255,0.3)',
                      lineHeight: '1.5',
                    }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'steps':
      return (
        <div style={{ margin: '24px 0' }}>
          {block.steps.map((step, i) => (
            <div
              key={i}
              style={{
                display: 'flex', gap: '16px',
                marginBottom: i < block.steps.length - 1 ? '0' : '0',
                position: 'relative',
              }}
            >
              {/* Connector line */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'rgba(100,102,255,0.1)',
                  border: '2px solid rgba(100,102,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700, color: '#6466FF',
                  flexShrink: 0,
                  zIndex: 1,
                }}>
                  {i + 1}
                </div>
                {i < block.steps.length - 1 && (
                  <div style={{
                    width: '2px', flex: 1, minHeight: '24px',
                    background: 'rgba(100,102,255,0.15)',
                    margin: '4px 0',
                  }} />
                )}
              </div>
              {/* Content */}
              <div style={{ paddingBottom: i < block.steps.length - 1 ? '20px' : '0', paddingTop: '4px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#1E1B39', marginBottom: '4px' }}>
                  {step.title}
                </div>
                <div style={{ fontSize: '14px', color: '#3D3A5C', lineHeight: '1.7' }}>
                  {step.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      );

    case 'divider':
      return <hr style={{ border: 'none', borderTop: '1px solid rgba(212,200,255,0.4)', margin: '32px 0' }} />;

    default:
      return null;
  }
}
