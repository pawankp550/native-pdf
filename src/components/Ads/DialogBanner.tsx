import { AdsBanner } from "./AdsBanner";

export const DialogBanner = () => (
  <div className="mt-4 pt-4 border-t border-border flex items-center justify-center w-full h-14 text-xs text-muted-foreground">
    <AdsBanner dataAdSlot={import.meta.env.VITE_ADSENSE_DIALOG_SLOT_ID}/>
  </div>
);


