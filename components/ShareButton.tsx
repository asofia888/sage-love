
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const ShareButton: React.FC = () => {
    const { t } = useTranslation();
    const [isCopied, setIsCopied] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const getShareUrl = () => {
        return new URL(window.location.pathname, window.location.origin).href;
    };

    const getShareText = () => {
        return `${t('appName')} - ${t('appSubtitle')}`;
    };

    const handleNativeShare = async () => {
        const shareData = {
            title: t('appName'),
            text: t('appSubtitle'),
            url: getShareUrl(),
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                setIsDropdownOpen(false);
            } catch (error) {
                if ((error as DOMException).name !== 'AbortError') {
                    console.error('Web Share API failed:', error);
                }
            }
        }
    };

    const handleLineShare = () => {
        const url = getShareUrl();
        const text = getShareText();
        const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        window.open(lineUrl, '_blank', 'width=600,height=600');
        setIsDropdownOpen(false);
    };

    const handleXShare = () => {
        const url = getShareUrl();
        const text = getShareText();
        const xUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        window.open(xUrl, '_blank', 'width=600,height=400');
        setIsDropdownOpen(false);
    };

    const handleFacebookShare = () => {
        const url = getShareUrl();
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        window.open(facebookUrl, '_blank', 'width=600,height=400');
        setIsDropdownOpen(false);
    };

    const handleCopyLink = async () => {
        const url = getShareUrl();
        
        try {
            await navigator.clipboard.writeText(url);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.warn('Clipboard API failed. Falling back to execCommand.', err);
            // Fallback for older browsers/insecure contexts
            const textArea = document.createElement("textarea");
            textArea.value = url;
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
        setIsDropdownOpen(false);
    };
  
    const tooltipText = isCopied ? t('shareSuccessTooltip') : t('shareAppTooltip');
  
    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
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

            {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 rounded-lg shadow-lg border border-slate-600 py-2 z-50">
                    {/* Native Share (if available) */}
                    {navigator.share && (
                        <button
                            onClick={handleNativeShare}
                            className="w-full px-4 py-2 text-left text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.935-2.186 2.25 2.25 0 00-3.935 2.186z" />
                            </svg>
                            {t('shareAppButtonLabel')}
                        </button>
                    )}

                    {/* LINE Share */}
                    <button
                        onClick={handleLineShare}
                        className="w-full px-4 py-2 text-left text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center"
                    >
                        <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771z"/>
                            <path d="M12.5 0C5.607 0 0 4.925 0 10.999 0 17.072 5.607 22 12.5 22S25 17.072 25 10.999C25 4.925 19.393 0 12.5 0zM12.5 20.073c-5.746 0-10.405-4.12-10.405-9.074S6.754 1.925 12.5 1.925s10.405 4.121 10.405 9.074-4.659 9.074-10.405 9.074z"/>
                        </svg>
                        {t('shareWithLine')}
                    </button>

                    {/* X (formerly Twitter) Share */}
                    <button
                        onClick={handleXShare}
                        className="w-full px-4 py-2 text-left text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center"
                    >
                        <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        {t('shareWithTwitter')}
                    </button>

                    {/* Facebook Share */}
                    <button
                        onClick={handleFacebookShare}
                        className="w-full px-4 py-2 text-left text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center"
                    >
                        <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        {t('shareWithFacebook')}
                    </button>

                    {/* Copy Link */}
                    <button
                        onClick={handleCopyLink}
                        className="w-full px-4 py-2 text-left text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                        </svg>
                        {t('copyLink')}
                    </button>
                </div>
            )}
        </div>
    );
  };

  export default ShareButton;
