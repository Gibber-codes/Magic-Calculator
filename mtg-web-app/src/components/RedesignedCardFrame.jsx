import React from 'react';

/**
 * Redesigned MTG Card Frame Components
 * 
 * Key Design Change: Power/Toughness is now a separate floating banner
 * instead of being embedded in the bottom bar
 */

// 1. TOP BANNER - Title Bar with name plate
export const TopBanner = ({
    width = 350,
    height = 56,
    borderColor = '#2d5016',
    fillColor = '#3d7020',
    children
}) => {
    const outerBorderWidth = height * 0.04;
    const innerBorderWidth = height * 0.025;
    const borderGap = height * 0.04;
    const cornerRadius = height * 0.32;

    // Slight outward arc on top edge (using path with quadratic curve)
    const topArcDepth = height * 0.08;

    // Name plate dimensions
    const namePlateMargin = height * 0.16;
    const namePlateHeight = height - (namePlateMargin * 2);
    const namePlateRadius = namePlateHeight * 0.42;

    // Calculate text area for foreignObject
    const textX = outerBorderWidth + borderGap + namePlateMargin;
    const textY = topArcDepth + namePlateMargin;
    const textWidth = width - (outerBorderWidth + borderGap + namePlateMargin) * 2;

    return (
        <div style={{ position: 'relative', width, height: height + topArcDepth }}>
            <svg
                width={width}
                height={height + topArcDepth}
                viewBox={`0 0 ${width} ${height + topArcDepth}`}
                xmlns="http://www.w3.org/2000/svg"
                style={{ position: 'absolute', top: 0, left: 0 }}
            >
                {/* Outer border with top arc */}
                <path
                    d={`
            M ${cornerRadius + outerBorderWidth / 2} ${topArcDepth + outerBorderWidth / 2}
            Q ${width / 2} ${outerBorderWidth / 2}, ${width - cornerRadius - outerBorderWidth / 2} ${topArcDepth + outerBorderWidth / 2}
            Q ${width - outerBorderWidth / 2} ${topArcDepth + outerBorderWidth / 2}, ${width - outerBorderWidth / 2} ${topArcDepth + cornerRadius}
            L ${width - outerBorderWidth / 2} ${height + topArcDepth - cornerRadius - outerBorderWidth / 2}
            Q ${width - outerBorderWidth / 2} ${height + topArcDepth - outerBorderWidth / 2}, ${width - cornerRadius - outerBorderWidth / 2} ${height + topArcDepth - outerBorderWidth / 2}
            L ${cornerRadius + outerBorderWidth / 2} ${height + topArcDepth - outerBorderWidth / 2}
            Q ${outerBorderWidth / 2} ${height + topArcDepth - outerBorderWidth / 2}, ${outerBorderWidth / 2} ${height + topArcDepth - cornerRadius - outerBorderWidth / 2}
            L ${outerBorderWidth / 2} ${topArcDepth + cornerRadius}
            Q ${outerBorderWidth / 2} ${topArcDepth + outerBorderWidth / 2}, ${cornerRadius + outerBorderWidth / 2} ${topArcDepth + outerBorderWidth / 2}
            `}
                    fill={borderColor}
                    stroke={borderColor}
                    strokeWidth={outerBorderWidth}
                />

                {/* Main fill with top arc */}
                <path
                    d={`
            M ${cornerRadius + outerBorderWidth + borderGap} ${topArcDepth + outerBorderWidth + borderGap}
            Q ${width / 2} ${outerBorderWidth + borderGap + topArcDepth * 0.3}, ${width - cornerRadius - outerBorderWidth - borderGap} ${topArcDepth + outerBorderWidth + borderGap}
            Q ${width - outerBorderWidth - borderGap} ${topArcDepth + outerBorderWidth + borderGap}, ${width - outerBorderWidth - borderGap} ${topArcDepth + cornerRadius * 0.7}
            L ${width - outerBorderWidth - borderGap} ${height + topArcDepth - cornerRadius * 0.7 - outerBorderWidth - borderGap}
            Q ${width - outerBorderWidth - borderGap} ${height + topArcDepth - outerBorderWidth - borderGap}, ${width - cornerRadius * 0.7 - outerBorderWidth - borderGap} ${height + topArcDepth - outerBorderWidth - borderGap}
            L ${cornerRadius * 0.7 + outerBorderWidth + borderGap} ${height + topArcDepth - outerBorderWidth - borderGap}
            Q ${outerBorderWidth + borderGap} ${height + topArcDepth - outerBorderWidth - borderGap}, ${outerBorderWidth + borderGap} ${height + topArcDepth - cornerRadius * 0.7 - outerBorderWidth - borderGap}
            L ${outerBorderWidth + borderGap} ${topArcDepth + cornerRadius * 0.7}
            Q ${outerBorderWidth + borderGap} ${topArcDepth + outerBorderWidth + borderGap}, ${cornerRadius + outerBorderWidth + borderGap} ${topArcDepth + outerBorderWidth + borderGap}
            `}
                    fill={fillColor}
                />

                {/* Inner inset border */}
                <path
                    d={`
            M ${cornerRadius + outerBorderWidth + borderGap} ${topArcDepth + outerBorderWidth + borderGap}
            Q ${width / 2} ${outerBorderWidth + borderGap + topArcDepth * 0.3}, ${width - cornerRadius - outerBorderWidth - borderGap} ${topArcDepth + outerBorderWidth + borderGap}
            Q ${width - outerBorderWidth - borderGap} ${topArcDepth + outerBorderWidth + borderGap}, ${width - outerBorderWidth - borderGap} ${topArcDepth + cornerRadius * 0.7}
            L ${width - outerBorderWidth - borderGap} ${height + topArcDepth - cornerRadius * 0.7 - outerBorderWidth - borderGap}
            Q ${width - outerBorderWidth - borderGap} ${height + topArcDepth - outerBorderWidth - borderGap}, ${width - cornerRadius * 0.7 - outerBorderWidth - borderGap} ${height + topArcDepth - outerBorderWidth - borderGap}
            L ${cornerRadius * 0.7 + outerBorderWidth + borderGap} ${height + topArcDepth - outerBorderWidth - borderGap}
            Q ${outerBorderWidth + borderGap} ${height + topArcDepth - outerBorderWidth - borderGap}, ${outerBorderWidth + borderGap} ${height + topArcDepth - cornerRadius * 0.7 - outerBorderWidth - borderGap}
            L ${outerBorderWidth + borderGap} ${topArcDepth + cornerRadius * 0.7}
            Q ${outerBorderWidth + borderGap} ${topArcDepth + outerBorderWidth + borderGap}, ${cornerRadius + outerBorderWidth + borderGap} ${topArcDepth + outerBorderWidth + borderGap}
            `}
                    fill="none"
                    stroke={borderColor}
                    strokeWidth={innerBorderWidth}
                    opacity="0.6"
                />

                {/* Name plate - centered area */}
                <rect
                    x={textX}
                    y={textY}
                    width={textWidth}
                    height={namePlateHeight}
                    rx={namePlateRadius}
                    ry={namePlateRadius}
                    fill="#f8f8f8"
                    stroke="#d0d0d0"
                    strokeWidth={innerBorderWidth * 0.8}
                />
            </svg>

            {/* Text Overlay */}
            <div style={{
                position: 'absolute',
                left: textX,
                top: textY,
                width: textWidth,
                height: namePlateHeight,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 8,
                paddingRight: 8,
                boxSizing: 'border-box',
                pointerEvents: 'none'
            }}>
                {children}
            </div>
        </div>
    );
};

// 2. MAIN ART WINDOW - Rectangular space with rounded corners
export const ArtWindow = ({
    width = 350,
    height = 262.5, // 4:3 ratio
    borderWidth = 2,
    borderColor = '#000000',
    cornerRadius = 4,
    children
}) => {
    return (
        <div style={{ position: 'relative', width, height }}>
            <svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                xmlns="http://www.w3.org/2000/svg"
                style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 10 }}
            >
                {/* Clean border frame */}
                <rect
                    x={borderWidth / 2}
                    y={borderWidth / 2}
                    width={width - borderWidth}
                    height={height - borderWidth}
                    rx={cornerRadius}
                    ry={cornerRadius}
                    fill="none"
                    stroke={borderColor}
                    strokeWidth={borderWidth}
                />
            </svg>

            {/* Interior Content - Image goes here */}
            <div style={{
                position: 'absolute',
                top: borderWidth,
                left: borderWidth,
                width: width - borderWidth * 2,
                height: height - borderWidth * 2,
                borderRadius: cornerRadius - 1,
                overflow: 'hidden',
                backgroundColor: '#1a1a1a'
            }}>
                {children || (
                    <div style={{
                        width: '100%', height: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#666', fontFamily: 'monospace', fontSize: 13
                    }}>
                        {width} × {height}px
                    </div>
                )}
            </div>
        </div>
    );
};

// 3. BOTTOM BANNER - Type Line Bar (no P/T attached)
export const BottomBanner = ({
    width = 350,
    height = 56,
    borderColor = '#2d5016',
    fillColor = '#3d7020',
    children
}) => {
    const outerBorderWidth = height * 0.04;
    const innerBorderWidth = height * 0.025;
    const borderGap = height * 0.04;
    const cornerRadius = height * 0.32;

    // Slight outward arc on bottom edge
    const bottomArcDepth = height * 0.08;

    // Type line area dimensions (now full width since no P/T box)
    const typeLineMargin = height * 0.16;
    const typeLineHeight = height - (typeLineMargin * 2);
    const typeLineRadius = typeLineHeight * 0.42;

    const textX = outerBorderWidth + borderGap + typeLineMargin;
    const textY = typeLineMargin;
    const textWidth = width - (outerBorderWidth + borderGap + typeLineMargin) * 2;

    return (
        <div style={{ position: 'relative', width, height: height + bottomArcDepth }}>
            <svg
                width={width}
                height={height + bottomArcDepth}
                viewBox={`0 0 ${width} ${height + bottomArcDepth}`}
                xmlns="http://www.w3.org/2000/svg"
                style={{ position: 'absolute', top: 0, left: 0 }}
            >
                {/* Outer border with bottom arc */}
                <path
                    d={`
            M ${cornerRadius + outerBorderWidth / 2} ${outerBorderWidth / 2}
            L ${width - cornerRadius - outerBorderWidth / 2} ${outerBorderWidth / 2}
            Q ${width - outerBorderWidth / 2} ${outerBorderWidth / 2}, ${width - outerBorderWidth / 2} ${cornerRadius}
            L ${width - outerBorderWidth / 2} ${height - cornerRadius + outerBorderWidth / 2}
            Q ${width - outerBorderWidth / 2} ${height + outerBorderWidth / 2}, ${width - cornerRadius - outerBorderWidth / 2} ${height + outerBorderWidth / 2}
            Q ${width / 2} ${height + bottomArcDepth - outerBorderWidth / 2}, ${cornerRadius + outerBorderWidth / 2} ${height + outerBorderWidth / 2}
            Q ${outerBorderWidth / 2} ${height + outerBorderWidth / 2}, ${outerBorderWidth / 2} ${height - cornerRadius + outerBorderWidth / 2}
            L ${outerBorderWidth / 2} ${cornerRadius}
            Q ${outerBorderWidth / 2} ${outerBorderWidth / 2}, ${cornerRadius + outerBorderWidth / 2} ${outerBorderWidth / 2}
            `}
                    fill={borderColor}
                    stroke={borderColor}
                    strokeWidth={outerBorderWidth}
                />

                {/* Main fill with bottom arc */}
                <path
                    d={`
            M ${cornerRadius * 0.7 + outerBorderWidth + borderGap} ${outerBorderWidth + borderGap}
            L ${width - cornerRadius * 0.7 - outerBorderWidth - borderGap} ${outerBorderWidth + borderGap}
            Q ${width - outerBorderWidth - borderGap} ${outerBorderWidth + borderGap}, ${width - outerBorderWidth - borderGap} ${cornerRadius * 0.7}
            L ${width - outerBorderWidth - borderGap} ${height - cornerRadius * 0.7 + outerBorderWidth + borderGap}
            Q ${width - outerBorderWidth - borderGap} ${height + outerBorderWidth + borderGap}, ${width - cornerRadius * 0.7 - outerBorderWidth - borderGap} ${height + outerBorderWidth + borderGap}
            Q ${width / 2} ${height + bottomArcDepth - outerBorderWidth - borderGap - bottomArcDepth * 0.3}, ${cornerRadius * 0.7 + outerBorderWidth + borderGap} ${height + outerBorderWidth + borderGap}
            Q ${outerBorderWidth + borderGap} ${height + outerBorderWidth + borderGap}, ${outerBorderWidth + borderGap} ${height - cornerRadius * 0.7 + outerBorderWidth + borderGap}
            L ${outerBorderWidth + borderGap} ${cornerRadius * 0.7}
            Q ${outerBorderWidth + borderGap} ${outerBorderWidth + borderGap}, ${cornerRadius * 0.7 + outerBorderWidth + borderGap} ${outerBorderWidth + borderGap}
            `}
                    fill={fillColor}
                />

                {/* Inner inset border */}
                <path
                    d={`
            M ${cornerRadius * 0.7 + outerBorderWidth + borderGap} ${outerBorderWidth + borderGap}
            L ${width - cornerRadius * 0.7 - outerBorderWidth - borderGap} ${outerBorderWidth + borderGap}
            Q ${width - outerBorderWidth - borderGap} ${outerBorderWidth + borderGap}, ${width - outerBorderWidth - borderGap} ${cornerRadius * 0.7}
            L ${width - outerBorderWidth - borderGap} ${height - cornerRadius * 0.7 + outerBorderWidth + borderGap}
            Q ${width - outerBorderWidth - borderGap} ${height + outerBorderWidth + borderGap}, ${width - cornerRadius * 0.7 - outerBorderWidth - borderGap} ${height + outerBorderWidth + borderGap}
            Q ${width / 2} ${height + bottomArcDepth - outerBorderWidth - borderGap - bottomArcDepth * 0.3}, ${cornerRadius * 0.7 + outerBorderWidth + borderGap} ${height + outerBorderWidth + borderGap}
            Q ${outerBorderWidth + borderGap} ${height + outerBorderWidth + borderGap}, ${outerBorderWidth + borderGap} ${height - cornerRadius * 0.7 + outerBorderWidth + borderGap}
            L ${outerBorderWidth + borderGap} ${cornerRadius * 0.7}
            Q ${outerBorderWidth + borderGap} ${outerBorderWidth + borderGap}, ${cornerRadius * 0.7 + outerBorderWidth + borderGap} ${outerBorderWidth + borderGap}
            `}
                    fill="none"
                    stroke={borderColor}
                    strokeWidth={innerBorderWidth}
                    opacity="0.6"
                />

                {/* Type line area - full width */}
                <rect
                    x={textX}
                    y={textY}
                    width={textWidth}
                    height={typeLineHeight}
                    rx={typeLineRadius}
                    ry={typeLineRadius}
                    fill="#f8f8f8"
                    stroke="#d0d0d0"
                    strokeWidth={innerBorderWidth * 0.8}
                />
            </svg>

            {/* Text Overlay */}
            <div style={{
                position: 'absolute',
                left: textX,
                top: textY,
                width: textWidth,
                height: typeLineHeight,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 8,
                paddingRight: 8,
                boxSizing: 'border-box',
                pointerEvents: 'none'
            }}>
                {children}
            </div>
        </div>
    );
};

// 4. STANDALONE POWER/TOUGHNESS BANNER - Independent floating element
export const PowerToughnessBanner = ({
    width = 70,
    height = 50,
    borderColor = '#2d5016',
    fillColor = '#3d7020',
    children
}) => {
    const outerBorderWidth = height * 0.04;
    const innerBorderWidth = height * 0.025;
    const borderGap = height * 0.04;
    const cornerRadius = height * 0.32;

    // P/T display area
    const displayMargin = height * 0.14;
    const displayHeight = height - (displayMargin * 2);
    const displayRadius = displayHeight * 0.38;

    const textX = outerBorderWidth + borderGap + displayMargin;
    const textY = displayMargin;
    const textWidth = width - (outerBorderWidth + borderGap + displayMargin) * 2;

    return (
        <div style={{ position: 'relative', width, height }}>
            <svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                xmlns="http://www.w3.org/2000/svg"
                style={{ position: 'absolute', top: 0, left: 0 }}
            >
                {/* Outer border */}
                <rect
                    x={outerBorderWidth / 2}
                    y={outerBorderWidth / 2}
                    width={width - outerBorderWidth}
                    height={height - outerBorderWidth}
                    rx={cornerRadius}
                    ry={cornerRadius}
                    fill={borderColor}
                    stroke={borderColor}
                    strokeWidth={outerBorderWidth}
                />

                {/* Main fill */}
                <rect
                    x={outerBorderWidth + borderGap}
                    y={outerBorderWidth + borderGap}
                    width={width - (outerBorderWidth + borderGap) * 2}
                    height={height - (outerBorderWidth + borderGap) * 2}
                    rx={cornerRadius * 0.7}
                    ry={cornerRadius * 0.7}
                    fill={fillColor}
                />

                {/* Inner inset border */}
                <rect
                    x={outerBorderWidth + borderGap}
                    y={outerBorderWidth + borderGap}
                    width={width - (outerBorderWidth + borderGap) * 2}
                    height={height - (outerBorderWidth + borderGap) * 2}
                    rx={cornerRadius * 0.7}
                    ry={cornerRadius * 0.7}
                    fill="none"
                    stroke={borderColor}
                    strokeWidth={innerBorderWidth}
                    opacity="0.6"
                />

                {/* P/T display area */}
                <rect
                    x={textX}
                    y={textY}
                    width={textWidth}
                    height={displayHeight}
                    rx={displayRadius}
                    ry={displayRadius}
                    fill="#f8f8f8"
                    stroke="#d0d0d0"
                    strokeWidth={innerBorderWidth * 0.8}
                />
            </svg>

            <div style={{
                position: 'absolute',
                left: textX,
                top: textY,
                width: textWidth,
                height: displayHeight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                color: '#000',
                fontSize: height * 0.4,
                pointerEvents: 'none'
            }}>
                {children}
            </div>
        </div>
    );
};
