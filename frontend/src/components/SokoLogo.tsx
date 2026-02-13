import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Svg, { Circle, Line, Defs, LinearGradient, Stop, G, Ellipse, Path } from 'react-native-svg';

// Soko Brand Colors
export const SOKO_COLORS = {
  primary: '#FF6B35',      // Warm orange (African sunset, marketplace energy)
  secondary: '#004E64',    // Deep teal (trust, professionalism)
  accent: '#FFB563',       // Golden yellow (prosperity, market goods)
  dark: '#1A1A2E',         // Dark background
  light: '#F7F7F7',        // Light background
  gradient1: '#FF6B35',    // Gradient start
  gradient2: '#FF9F1C',    // Gradient end
  cosmic: '#8B5CF6',       // Purple for cosmic effect
  nebula: '#EC4899',       // Pink nebula
};

// Import the actual Soko logo image
const SokoLogoImage = require('../../assets/images/soko-logo.png');

interface SokoLogoProps {
  size?: number;
  variant?: 'full' | 'icon' | 'text';
  color?: 'light' | 'dark' | 'colored';
}

// New: Actual Soko Image Logo Component
export const SokoImageLogo = ({ size = 40 }: { size?: number }) => {
  return (
    <Image 
      source={SokoLogoImage}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

// Galaxy-style "S" with interconnected planets and orbital rings
export const SokoIconLogo = ({ size = 40, color = 'colored' }: { size?: number; color?: 'light' | 'dark' | 'colored' }) => {
  // Color schemes based on mode
  const planetColor = color === 'light' ? '#FFFFFF' : color === 'dark' ? '#1A1A2E' : SOKO_COLORS.primary;
  const orbitColor = color === 'light' ? 'rgba(255,255,255,0.3)' : color === 'dark' ? 'rgba(26,26,46,0.2)' : 'rgba(255,107,53,0.25)';
  const connectionColor = color === 'light' ? 'rgba(255,255,255,0.5)' : color === 'dark' ? 'rgba(26,26,46,0.4)' : 'rgba(255,159,28,0.6)';
  const glowColor = color === 'light' ? 'rgba(255,255,255,0.2)' : color === 'dark' ? 'rgba(26,26,46,0.1)' : 'rgba(255,107,53,0.15)';
  const moonColor = color === 'colored' ? SOKO_COLORS.accent : planetColor;
  const cosmicColor = color === 'colored' ? SOKO_COLORS.cosmic : planetColor;
  
  // Planets forming an "S" shape - like a galaxy constellation
  const planets = [
    // Top arc of S
    { x: 72, y: 18, size: 7, hasRing: true, ringAngle: -20, main: true },
    { x: 50, y: 12, size: 5, hasRing: false, main: false, moon: true },
    { x: 28, y: 20, size: 6, hasRing: true, ringAngle: 15, main: true },
    
    // Middle - Central "sun" of the galaxy
    { x: 50, y: 50, size: 12, hasRing: true, ringAngle: 0, main: true, center: true },
    
    // Bottom arc of S
    { x: 72, y: 80, size: 6, hasRing: true, ringAngle: -15, main: true },
    { x: 50, y: 88, size: 5, hasRing: false, main: false, moon: true },
    { x: 28, y: 82, size: 7, hasRing: true, ringAngle: 20, main: true },
  ];
  
  // Orbital paths connecting planets (curved connections)
  const orbitalPaths = [
    // Top arc
    { from: 0, to: 1, curve: -8 },
    { from: 1, to: 2, curve: -8 },
    // Connect to center
    { from: 2, to: 3, curve: 15 },
    { from: 0, to: 3, curve: -15 },
    // Bottom arc
    { from: 3, to: 4, curve: 15 },
    { from: 3, to: 6, curve: -15 },
    { from: 4, to: 5, curve: 8 },
    { from: 5, to: 6, curve: 8 },
    // Cross connections for galaxy web effect
    { from: 2, to: 6, curve: 0, dashed: true },
    { from: 0, to: 4, curve: 0, dashed: true },
  ];
  
  // Generate curved path between two points
  const getCurvedPath = (x1: number, y1: number, x2: number, y2: number, curve: number) => {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    // Perpendicular offset for curve
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const offsetX = (-dy / len) * curve;
    const offsetY = (dx / len) * curve;
    const ctrlX = midX + offsetX;
    const ctrlY = midY + offsetY;
    return `M ${x1} ${y1} Q ${ctrlX} ${ctrlY} ${x2} ${y2}`;
  };
  
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="sokoSunGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={SOKO_COLORS.gradient1} />
          <Stop offset="50%" stopColor={SOKO_COLORS.gradient2} />
          <Stop offset="100%" stopColor={SOKO_COLORS.accent} />
        </LinearGradient>
        <LinearGradient id="sokoCosmicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={SOKO_COLORS.cosmic} />
          <Stop offset="100%" stopColor={SOKO_COLORS.nebula} />
        </LinearGradient>
      </Defs>
      
      {/* Glow effect behind center planet */}
      <Circle
        cx={50}
        cy={50}
        r={20}
        fill={glowColor}
        opacity={0.5}
      />
      
      {/* Orbital connection paths */}
      <G>
        {orbitalPaths.map((path, idx) => (
          <Path
            key={`orbit-${idx}`}
            d={getCurvedPath(
              planets[path.from].x,
              planets[path.from].y,
              planets[path.to].x,
              planets[path.to].y,
              path.curve
            )}
            stroke={path.dashed ? cosmicColor : connectionColor}
            strokeWidth={path.dashed ? 1 : 1.5}
            strokeDasharray={path.dashed ? "3,3" : undefined}
            fill="none"
            opacity={path.dashed ? 0.4 : 0.7}
          />
        ))}
      </G>
      
      {/* Planet rings (drawn before planets) */}
      <G>
        {planets.filter(p => p.hasRing).map((planet, idx) => (
          <G key={`ring-group-${idx}`}>
            <Ellipse
              cx={planet.x}
              cy={planet.y}
              rx={planet.size * 1.8}
              ry={planet.size * 0.5}
              fill="none"
              stroke={planet.center ? SOKO_COLORS.accent : orbitColor}
              strokeWidth={planet.center ? 2 : 1.2}
              opacity={planet.center ? 0.8 : 0.6}
              rotation={planet.ringAngle}
              origin={`${planet.x}, ${planet.y}`}
            />
          </G>
        ))}
      </G>
      
      {/* Planets */}
      <G>
        {planets.map((planet, idx) => (
          <G key={`planet-${idx}`}>
            {/* Planet body */}
            <Circle
              cx={planet.x}
              cy={planet.y}
              r={planet.size}
              fill={planet.center ? 'url(#sokoSunGradient)' : planet.moon ? moonColor : planetColor}
              opacity={planet.main ? 1 : 0.8}
            />
            {/* Highlight/shine on planet */}
            <Circle
              cx={planet.x - planet.size * 0.3}
              cy={planet.y - planet.size * 0.3}
              r={planet.size * 0.25}
              fill={color === 'light' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.4)'}
              opacity={0.6}
            />
          </G>
        ))}
      </G>
      
      {/* Small orbiting moons/satellites */}
      <G>
        <Circle cx={78} cy={14} r={2} fill={moonColor} opacity={0.7} />
        <Circle cx={22} cy={86} r={2} fill={moonColor} opacity={0.7} />
        <Circle cx={62} cy={50} r={2.5} fill={cosmicColor} opacity={0.6} />
      </G>
    </Svg>
  );
};

// App Colors for the colorful logo - each app has its own color
const APP_COLORS = {
  retailPro: '#3B82F6',    // Blue - Retail Pro
  inventory: '#10B981',    // Green - Inventory
  invoicing: '#8B5CF6',    // Purple - Invoicing
  kwikPay: '#F59E0B',      // Amber - KwikPay
  uniTxt: '#06B6D4',       // Cyan - UniTxt
  inTime: '#EC4899',       // Pink - InTime
  accounting: '#6366F1',   // Indigo - Accounting
  expenses: '#EF4444',     // Red - Expenses
  loyalty: '#F472B6',      // Rose - Loyalty
  center: '#FF6B35',       // Orange - Soko Center (sun)
};

// Colorful "S" with vibrant app-colored planets - Now uses actual Soko logo image
export const SokoColorfulLogo = ({ size = 40, color = 'colored' }: { size?: number; color?: 'light' | 'dark' | 'colored' }) => {
  // Use the actual Soko logo image
  return (
    <Image 
      source={SokoLogoImage}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

// Icon with circular background
export const SokoIconWithBg = ({ size = 40, color = 'colored', bgStyle = 'gradient' }: { 
  size?: number; 
  color?: 'light' | 'dark' | 'colored';
  bgStyle?: 'gradient' | 'solid' | 'none';
}) => {
  return (
    <View style={[styles.iconBgContainer, { width: size, height: size, borderRadius: size * 0.25 }]}>
      {bgStyle === 'gradient' && (
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={SOKO_COLORS.dark} />
              <Stop offset="100%" stopColor="#2D2D44" />
            </LinearGradient>
          </Defs>
          <Circle cx={size/2} cy={size/2} r={size/2} fill="url(#bgGradient)" />
        </Svg>
      )}
      {bgStyle === 'solid' && (
        <View style={[styles.solidBg, { borderRadius: size * 0.25, backgroundColor: SOKO_COLORS.dark }]} />
      )}
      <SokoIconLogo size={size * 0.75} color={bgStyle !== 'none' ? 'colored' : color} />
    </View>
  );
};

// Full logo with text
export const SokoFullLogo = ({ size = 120, color = 'colored' }: { size?: number; color?: 'light' | 'dark' | 'colored' }) => {
  const textColor = color === 'light' ? '#FFFFFF' : color === 'dark' ? '#1A1A2E' : SOKO_COLORS.primary;
  const subtitleColor = color === 'light' ? 'rgba(255,255,255,0.7)' : color === 'dark' ? '#6B7280' : SOKO_COLORS.secondary;
  
  return (
    <View style={styles.fullLogoContainer}>
      <SokoIconLogo size={size * 0.5} color={color} />
      <View style={styles.textContainer}>
        <Text style={[styles.logoText, { color: textColor, fontSize: size * 0.28 }]}>soko</Text>
        <Text style={[styles.tagline, { color: subtitleColor, fontSize: size * 0.09 }]}>Your Digital Marketplace</Text>
      </View>
    </View>
  );
};

// Horizontal logo variant
export const SokoHorizontalLogo = ({ size = 36, color = 'colored' }: { size?: number; color?: 'light' | 'dark' | 'colored' }) => {
  const textColor = color === 'light' ? '#FFFFFF' : color === 'dark' ? '#1A1A2E' : SOKO_COLORS.primary;
  
  return (
    <View style={styles.horizontalContainer}>
      <SokoIconLogo size={size} color={color} />
      <Text style={[styles.horizontalText, { color: textColor, fontSize: size * 0.7 }]}>soko</Text>
    </View>
  );
};

// Badge/Pill style "Powered by Soko"
export const PoweredBySoko = ({ size = 'small' }: { size?: 'small' | 'medium' | 'large' }) => {
  const dimensions = {
    small: { icon: 18, text: 10, padding: 6 },
    medium: { icon: 22, text: 12, padding: 8 },
    large: { icon: 30, text: 14, padding: 12 },
  };
  const dim = dimensions[size];
  
  return (
    <View style={[styles.poweredByContainer, { paddingHorizontal: dim.padding * 1.5, paddingVertical: dim.padding }]}>
      <Text style={[styles.poweredByText, { fontSize: dim.text }]}>Powered by</Text>
      <SokoIconLogo size={dim.icon} color="colored" />
      <Text style={[styles.poweredBySoko, { fontSize: dim.text }]}>soko</Text>
    </View>
  );
};

// Animated loading logo (for splash screens)
export const SokoLoadingLogo = ({ size = 80 }: { size?: number }) => {
  return (
    <View style={styles.loadingContainer}>
      <SokoIconWithBg size={size} bgStyle="gradient" />
      <Text style={[styles.loadingText, { fontSize: size * 0.35 }]}>soko</Text>
      <Text style={[styles.loadingSubtext, { fontSize: size * 0.12 }]}>Your Digital Marketplace</Text>
    </View>
  );
};

// Mini badge for headers
export const SokoMiniBadge = ({ size = 28 }: { size?: number }) => {
  return (
    <View style={[styles.miniBadge, { width: size, height: size, borderRadius: size / 4 }]}>
      <SokoIconLogo size={size * 0.7} color="colored" />
    </View>
  );
};

const styles = StyleSheet.create({
  iconBgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  solidBg: {
    ...StyleSheet.absoluteFillObject,
  },
  fullLogoContainer: {
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  logoText: {
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'lowercase',
  },
  tagline: {
    marginTop: 4,
    letterSpacing: 0.5,
  },
  horizontalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  horizontalText: {
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'lowercase',
  },
  poweredByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.15)',
  },
  poweredByText: {
    color: '#9CA3AF',
    fontWeight: '500',
  },
  poweredBySoko: {
    color: SOKO_COLORS.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: SOKO_COLORS.primary,
    fontWeight: '800',
    letterSpacing: 3,
    marginTop: 20,
  },
  loadingSubtext: {
    color: '#6B7280',
    marginTop: 8,
  },
  miniBadge: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Main export component with all variants
export default function SokoLogo({ size = 40, variant = 'icon', color = 'colored' }: SokoLogoProps) {
  switch (variant) {
    case 'full':
      return <SokoFullLogo size={size} color={color} />;
    case 'text':
      return <SokoHorizontalLogo size={size} color={color} />;
    case 'icon':
    default:
      return <SokoIconLogo size={size} color={color} />;
  }
}
