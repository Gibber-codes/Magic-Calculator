import React from 'react';

/**
 * Redesigned MTG Card Frame Components
 *
 * Design Goal: Minimalist, art-focused, clean.
 * - Top: Name + Color Identity Dot
 * - Middle: Large Art Crop
 * - Bottom: Type Line
 * - Floating: Power/Toughness
 */

// 1. TOP BANNER - Name + Colored Dot
export const TopBanner = ({
    width = 140,
    height = 24,
    colorIdentity = null, // Expecting hex string for the dot
    children
}) => {
    return (
        <div style={{
            width,
            height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '0 4px',
            boxSizing: 'border-box'
        }}>
            {/* Color Identity Dot - only show if color is present and valid */}
            {colorIdentity && (
                <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: colorIdentity,
                    flexShrink: 0,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.2)'
                }} />
            )}

            {/* Name Content */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
            }}>
                {children}
            </div>
        </div>
    );
};

// 2. MAIN ART WINDOW - clean rounded rect
export const ArtWindow = ({
    width = 140,
    height = 100,
    children
}) => {
    return (
        <div style={{
            width,
            height,
            borderRadius: 6,
            overflow: 'hidden',
            backgroundColor: '#1a1a1a',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)', // Subtle lift
            position: 'relative' // For absolute children
        }}>
            {children || (
                <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#444', fontSize: 10
                }}>
                    No Art
                </div>
            )}
        </div>
    );
};

// 3. BOTTOM BANNER - Type Line
export const BottomBanner = ({
    width = 140,
    height = 24,
    children
}) => {
    return (
        <div style={{
            width,
            height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            boxSizing: 'border-box'
        }}>
            <div style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
            }}>
                {children}
            </div>
        </div>
    );
};

// 4. POWER/TOUGHNESS - Floating Banner
export const PowerToughnessBanner = ({
    width = 46,
    height = 24,
    // We might not need color props anymore if we go full minimal,
    // but keeping text color prop support is good.
    textColor = '#fff',
    backgroundColor = 'rgba(0, 0, 0, 0.85)',
    children
}) => {
    return (
        <div style={{
            width,
            height,
            backgroundColor: backgroundColor,
            borderRadius: 12, // Pill shape
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: textColor
        }}>
            {children}
        </div>
    );
};
