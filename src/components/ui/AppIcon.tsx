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
  | 'chevron'
  | 'close';

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
      return <Rect x="7" y="7" width="10" height="10" rx="1.5" {...common} />;
    case 'search':
      return (
        <>
          <Circle cx="11" cy="11" r="7" {...common} />
          <Path d="m20 20-4-4" {...common} />
        </>
      );
    case 'chevron':
      return <Path d="m9 6 6 6-6 6" {...common} />;
    case 'close':
      return <Path d="m6 6 12 12M18 6 6 18" {...common} />;
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
