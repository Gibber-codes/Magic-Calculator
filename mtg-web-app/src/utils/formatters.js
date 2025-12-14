
export const formatBigNumber = (num) => {
    if (num === undefined || num === null) return '';
    const absNum = Math.abs(num);

    if (absNum < 10000) return num.toString();

    if (absNum >= 1.0e+21) return (num / 1.0e+21).toFixed(1) + "S"; // Sextillion (why not)
    if (absNum >= 1.0e+18) return (num / 1.0e+18).toFixed(1) + "Qi"; // Quintillion
    if (absNum >= 1.0e+15) return (num / 1.0e+15).toFixed(1) + "Q"; // Quadrillion
    if (absNum >= 1.0e+12) return (num / 1.0e+12).toFixed(1) + "T"; // Trillion
    if (absNum >= 1.0e+9) return (num / 1.0e+9).toFixed(1) + "B"; // Billion
    if (absNum >= 1.0e+6) return (num / 1.0e+6).toFixed(1) + "M"; // Million
    if (absNum >= 1000) return (num / 1000).toFixed(1) + "k"; // Thousand (for >10k consistency)

    return num.toString();
};
