import React, { useEffect, useState } from 'react';
import { ADSENSE_CLIENT_ID, ADSENSE_SLOT_ID } from '../config/constants';

const AdBanner = () => {
    // For development/testing, we can toggle this to see the placeholder vs real ad
    // In a real scenario, you might check process.env.NODE_ENV === 'production'
    const isProduction = false; // Set to true to attempt loading real ads
    const [adLoaded, setAdLoaded] = useState(false);

    useEffect(() => {
        if (isProduction) {
            try {
                // Initialize AdSense
                // This assumes the AdSense script is loaded in index.html <head>
                // <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX" crossOrigin="anonymous"></script>
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                setAdLoaded(true);
            } catch (err) {
                console.error("AdSense error:", err);
            }
        }
    }, [isProduction]);

    return (
        <div className="w-full bg-slate-950 border-b border-slate-800 flex flex-col items-center justify-center relative z-40 select-none">

            {/* Ad Container */}
            <div className="ad-banner-top min-h-[50px] w-full flex justify-center items-center bg-slate-900/50">
                {isProduction ? (
                    // Actual AdSense Unit
                    <ins className="adsbygoogle"
                        style={{ display: 'block', minWidth: '320px', minHeight: '50px' }}
                        data-ad-client={ADSENSE_CLIENT_ID}
                        data-ad-slot={ADSENSE_SLOT_ID}
                        data-ad-format="horizontal"
                        data-full-width-responsive="true">
                    </ins>
                ) : (
                    // Placeholder for Development / Before Approval
                    <div className="w-full h-[50px] sm:h-[60px] md:h-[90px] bg-slate-800/50 flex flex-col items-center justify-center text-slate-500 gap-1 animate-in fade-in duration-700">
                        <span className="text-xs font-medium">Ad Space - 320x50 (Expandable)</span>
                        <span className="text-[9px] opacity-60">Google AdSense Placeholder</span>
                    </div>
                )}
            </div>

            {/* Loading Skeleton (Only visible if production and ad hasn't reported loaded, 
                though AdSense handles its own filling mostly. This is a progressive enhancement idea) 
            */}
        </div>
    );
};

export default AdBanner;
