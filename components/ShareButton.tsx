
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const ShareButton: React.FC = () => {
    const { t } = useTranslation();
    const [isCopied, setIsCopied] = useState(false);

    const handleShare = async () => {
        // Construct the canonical URL. This ensures it's an absolute URL,
        // which is required by the Web Share API to prevent "Invalid URL" errors.
        const canonicalUrl = new URL(window.location.pathname, window.location.origin).href;

        const shareData = {
          title: t('appName'),
          text: t('appSubtitle'),
          url: canonicalUrl,
        };
    
        // Use Web Share API if available
        if (navigator.share) {
            try {
                await navigator.share(shareData);
                return; // Exit after successful share
            } catch (error) {
                // Ignore AbortError if user cancels share dialog, but log others
                if ((error as DOMException).name !== 'AbortError') {
                     console.error('Web Share API failed:', error);
                }
                return; // Don't fall back to clipboard if user cancels
            }
        }
    
        // Fallback: Copy to clipboard
        try {
            await navigator.clipboard.writeText(canonicalUrl);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.warn('Clipboard API failed. Falling back to execCommand.', err);
            // Fallback for older browsers/insecure contexts
            const textArea = document.createElement("textarea");
            textArea.value = canonicalUrl;
            // Make the textarea out of sight
            textArea.style.position = "fixed";
            textArea.style.top = "-9999px";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } catch (execErr) {
                console.error('Fallback copy failed:', execErr);
            } finally {
                document.body.removeChild(textArea);
            }
        }
      };
  
    const tooltipText = isCopied ? t('shareSuccessTooltip') : t('shareAppTooltip');
  
    return (
      <button
        onClick={handleShare}
        className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-600/70 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 transition-colors"
        aria-label={t('shareAppButtonLabel')}
        title={tooltipText}
      >
        {isCopied ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
        )}
      </button>
    );
  };

  export default ShareButton;
