import type { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type AppIconName =
  | 'home'
  | 'check'
  | 'target'
  | 'user'
  | 'bell'
  | 'plus'
  | 'arrow'
  | 'calendar'
  | 'clock'
  | 'play'
  | 'pause'
  | 'square'
  | 'search'
  | 'more'
  | 'chart'
  | 'shield'
  | 'camera'
  | 'chevron'
  | 'chevronDown'
  | 'edit'
  | 'sun'
  | 'lock'
  | 'help'
  | 'logout'
  | 'mail'
  | 'eye'
  | 'briefcase'
  | 'book'
  | 'phone'
  | 'spark'
  | 'close'
  | 'refresh'
  | 'alert'
  | 'trash';

interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

function renderPaths(name: AppIconName, color: string, strokeWidth: number): ReactNode {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  switch (name) {
    case 'home':
      return (
        <>
          <Path d="M3 10.5 12 3l9 7.5" {...common} />
          <Path d="M5 9v11h14V9M9 20v-6h6v6" {...common} />
        </>
      );
    case 'check':
      return <Path d="m5 12 4 4L19 6" {...common} />;
    case 'target':
      return (
        <>
          <Circle cx="12" cy="12" r="8" {...common} />
          <Circle cx="12" cy="12" r="3" {...common} />
          <Path d="M12 2v3M22 12h-3M12 22v-3M2 12h3" {...common} />
        </>
      );
    case 'user':
      return (
        <>
          <Circle cx="12" cy="8" r="4" {...common} />
          <Path d="M4 21c.7-4 3.3-6 8-6s7.3 2 8 6" {...common} />
        </>
      );
    case 'bell':
      return (
        <>
          <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" {...common} />
          <Path d="M10 21h4" {...common} />
        </>
      );
    case 'plus':
      return <Path d="M12 5v14M5 12h14" {...common} />;
    case 'arrow':
      return <Path d="m14 6-6 6 6 6" {...common} />;
    case 'calendar':
      return (
        <>
          <Rect x="3" y="5" width="18" height="16" rx="2" {...common} />
          <Path d="M8 3v4M16 3v4M3 10h18" {...common} />
        </>
      );
    case 'clock':
      return (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path d="M12 7v5l3 2" {...common} />
        </>
      );
    case 'play':
      return <Path d="m9 7 8 5-8 5Z" {...common} fill={color} />;
    case 'pause':
      return <Path d="M9 7v10M15 7v10" {...common} />;
    case 'square':
      return <Rect x="6.5" y="6.5" width="11" height="11" rx="2.5" {...common} fill={color} />;
    case 'search':
      return (
        <>
          <Circle cx="11" cy="11" r="7" {...common} />
          <Path d="m20 20-4-4" {...common} />
        </>
      );
    case 'more':
      return (
        <>
          <Circle cx="5" cy="12" r="1.2" fill={color} />
          <Circle cx="12" cy="12" r="1.2" fill={color} />
          <Circle cx="19" cy="12" r="1.2" fill={color} />
        </>
      );
    case 'chart':
      return <Path d="M4 20V10M10 20V4M16 20v-7M22 20H2" {...common} />;
    case 'shield':
      return <Path d="M12 3 4.5 6v5c0 5 3 8.5 7.5 10 4.5-1.5 7.5-5 7.5-10V6Z" {...common} />;
    case 'camera':
      return (
        <>
          <Rect x="3" y="6" width="18" height="14" rx="2" {...common} />
          <Circle cx="12" cy="13" r="4" {...common} />
          <Path d="m8 6 1.5-2h5L16 6" {...common} />
        </>
      );
    case 'chevron':
      return <Path d="m9 6 6 6-6 6" {...common} />;
    case 'chevronDown':
      return <Path d="m6 9 6 6 6-6" {...common} />;
    case 'edit':
      return (
        <>
          <Path d="m14 5 5 5L9 20H4v-5Z" {...common} />
          <Path d="m12 7 5 5" {...common} />
        </>
      );
    case 'sun':
      return (
        <>
          <Circle cx="12" cy="12" r="4" {...common} />
          <Path
            d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"
            {...common}
          />
        </>
      );
    case 'lock':
      return (
        <>
          <Rect x="5" y="10" width="14" height="11" rx="2" {...common} />
          <Path d="M8 10V7a4 4 0 0 1 8 0v3" {...common} />
        </>
      );
    case 'help':
      return (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path d="M9.5 9a2.7 2.7 0 1 1 4.6 2c-1.5 1.2-2.1 1.7-2.1 3M12 18h.01" {...common} />
        </>
      );
    case 'logout':
      return <Path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10" {...common} />;
    case 'mail':
      return (
        <>
          <Rect x="3" y="5" width="18" height="14" rx="2" {...common} />
          <Path d="m4 7 8 6 8-6" {...common} />
        </>
      );
    case 'eye':
      return (
        <>
          <Path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" {...common} />
          <Circle cx="12" cy="12" r="2.5" {...common} />
        </>
      );
    case 'briefcase':
      return (
        <>
          <Rect x="3" y="7" width="18" height="13" rx="2" {...common} />
          <Path d="M9 7V4h6v3M3 12h18" {...common} />
        </>
      );
    case 'book':
      return (
        <>
          <Path d="M4 4h6a2 2 0 0 1 2 2v15a3 3 0 0 0-3-3H4Z" {...common} />
          <Path d="M20 4h-6a2 2 0 0 0-2 2v15a3 3 0 0 1 3-3h5Z" {...common} />
        </>
      );
    case 'phone':
      return (
        <>
          <Rect x="6" y="2" width="12" height="20" rx="3" {...common} />
          <Path d="M10 18h4" {...common} />
        </>
      );
    case 'spark':
      return <Path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8Z" {...common} />;
    case 'close':
      return <Path d="m6 6 12 12M18 6 6 18" {...common} />;
    case 'refresh':
      return (
        <>
          <Path d="M20 11a8 8 0 0 0-14.5-3M4 4v4h4" {...common} />
          <Path d="M4 13a8 8 0 0 0 14.5 3M20 20v-4h-4" {...common} />
        </>
      );
    case 'alert':
      return (
        <>
          <Path d="M12 3 2.5 19.5h19L12 3Z" {...common} />
          <Path d="M12 9.5v4.5M12 17h.01" {...common} />
        </>
      );
    case 'trash':
      return (
        <>
          <Path d="M3 6h18" {...common} />
          <Path d="M8 6V4a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 16 4v2" {...common} />
          <Path d="M19 6l-1 13.5a2 2 0 0 1-2 1.5H8a2 2 0 0 1-2-1.5L5 6" {...common} />
          <Path d="M10 11v6M14 11v6" {...common} />
        </>
      );
  }
}

export function AppIcon({
  name,
  size = 20,
  color = '#ffffff',
  strokeWidth = 1.8,
}: AppIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {renderPaths(name, color, strokeWidth)}
    </Svg>
  );
}
