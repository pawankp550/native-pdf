import { useEffect, useRef } from 'react';

interface AdsBannerProps {
  dataAdSlot?: string;
  dataAdFormat?: string;
  fullWidthResponsive?: string;
}

export const AdsBanner = ({ 
  dataAdSlot = '', // Default slot ID, can be overridden by props
  dataAdFormat = 'auto', 
  fullWidthResponsive = 'true' 
}: AdsBannerProps) => {
  const initialized = useRef(false);

  useEffect(() => {
    // Prevent multiple pushes to the same component instance which can cause errors
    if (!initialized.current && typeof window !== 'undefined') {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        initialized.current = true;
      } catch (e) {
        console.error("AdSense error:", e);
      }
    }
  }, []);

  return (
    <div className="ad-container overflow-hidden" style={{ minHeight: '90px' }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', textAlign: 'center' }}
        data-ad-client={import.meta.env.VITE_ADSENSE_CLIENT_ID}
        data-ad-slot={dataAdSlot}
        data-ad-format={dataAdFormat}
        data-full-width-responsive={fullWidthResponsive}
      ></ins>
    </div>
  );
};


