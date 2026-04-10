import { useCallback, lazy, Suspense } from 'react';
import { Heart, X, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectShowSupportPrompt } from '@/store/pdf-editor/selectors';
import { setShowSupportPrompt } from '@/store/pdf-editor/slice';

const EdiPdfQrCode = lazy(() => import('./EdiPdfQrCode'));

export const SupportDialog = () => {
  const open = useAppSelector(selectShowSupportPrompt);
  const dispatch = useAppDispatch();

  const handleDismiss = useCallback(() => {
    sessionStorage.setItem('support-prompt-dismissed', '1');
    dispatch(setShowSupportPrompt(false));
  }, [dispatch]);

  if (!open) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
      <div className="pointer-events-auto bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl w-64 p-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-rose-500/10 text-rose-500">
              <Heart size={14} fill="currentColor" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Support EdiPDF</span>
          </div>
          <button 
            onClick={handleDismiss} 
            className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-md transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          Enjoying the tool? Your support helps us keep EdiPDF free and open for everyone.
        </p>

        <Suspense fallback={
          <div className="mt-3 h-40 flex items-center justify-center bg-muted/50 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        }>
          <EdiPdfQrCode />
        </Suspense>

        <div className="mt-4 flex flex-col gap-2">
          <a
            href="https://www.paypal.com/ncp/payment/YUC3F2N8WR6PL"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            <Heart size={12} /> Donate Now
          </a>
          <button 
            onClick={handleDismiss}
            className="text-[10px] text-muted-foreground hover:underline"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};
