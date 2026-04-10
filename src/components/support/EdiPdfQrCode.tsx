const EdiPdfQrCode = () => {
  return (
    <div className="mt-3 flex flex-col items-center gap-3 p-3 bg-white rounded-xl border border-border/50 shadow-sm transition-all hover:shadow-md">
      <div className="relative group">
        <img 
          src="/edipdf-qrcode.png" 
          alt="Support QR Code" 
          className="w-32 h-32 object-contain grayscale-[20%] group-hover:grayscale-0 transition-all duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 border-2 border-rose-500/5 rounded-lg pointer-events-none group-hover:border-rose-500/10 transition-colors" />
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] text-foreground font-semibold">Scan to Support</span>
        <span className="text-[9px] text-muted-foreground">PayPal / Credit Card</span>
      </div>
    </div>
  );
};

export default EdiPdfQrCode;
