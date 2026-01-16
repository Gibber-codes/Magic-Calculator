const toSuperscript = (str) => {
    const superscripts = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
    };
    return str.split('').map(c => superscripts[c] || c).join('');
};

export const formatBigNumber = (num) => {
    if (num === undefined || num === null) return '';

    // Handle BigInt values for extremely large token counts (2^2058 etc.)
    const isBigInt = typeof num === 'bigint';

    if (!isBigInt) {
        const absNum = Math.abs(num);
        if (absNum < 10000) return num.toString();

        if (absNum >= 1.0e+21) return (num / 1.0e+21).toFixed(1) + "S";
        if (absNum >= 1.0e+18) return (num / 1.0e+18).toFixed(1) + "Qi";
        if (absNum >= 1.0e+15) return (num / 1.0e+15).toFixed(1) + "Q";
        if (absNum >= 1.0e+12) return (num / 1.0e+12).toFixed(1) + "T";
        if (absNum >= 1.0e+9) return (num / 1.0e+9).toFixed(1) + "B";
        if (absNum >= 1.0e+6) return (num / 1.0e+6).toFixed(1) + "M";
        if (absNum >= 1000) return (num / 1000).toFixed(1) + "k";

        return num.toString();
    }

    // BigInt handling for astronomically large numbers
    const absNum = num < 0n ? -num : num;
    const sign = num < 0n ? '-' : '';

    if (absNum < 10000n) return num.toString();

    // Thresholds for BigInt - go all the way up to handle 2^2058 scale numbers
    const thresholds = [
        { suffix: ' × 10', power: 30n, usePower: true },  // Use scientific for anything larger than nonillion
        { suffix: 'Sp', divisor: 10n ** 24n },  // Septillion
        { suffix: 'S', divisor: 10n ** 21n },   // Sextillion
        { suffix: 'Qi', divisor: 10n ** 18n },  // Quintillion
        { suffix: 'Q', divisor: 10n ** 15n },   // Quadrillion
        { suffix: 'T', divisor: 10n ** 12n },   // Trillion
        { suffix: 'B', divisor: 10n ** 9n },    // Billion
        { suffix: 'M', divisor: 10n ** 6n },    // Million
        { suffix: 'k', divisor: 10n ** 3n },    // Thousand
    ];

    // For extremely large numbers, use scientific-ish notation
    for (const { suffix, divisor, power, usePower } of thresholds) {
        if (usePower) {
            const divisorCheck = 10n ** power;
            if (absNum >= divisorCheck) {
                const numStr = absNum.toString();
                const exponent = numStr.length - 1;
                const mantissa = parseFloat(numStr.slice(0, 4)) / 1000;
                // Use unicode superscripts for the exponent
                return sign + mantissa.toFixed(2) + suffix + toSuperscript(exponent.toString());
            }
        } else if (absNum >= divisor) {
            // Standard suffix formatting
            const result = Number(absNum * 10n / divisor) / 10;
            return sign + result.toFixed(1) + suffix;
        }
    }

    return num.toString();
};

