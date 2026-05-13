
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SageAvatarIcon } from './icons/SageAvatarIcon';

interface WelcomeMessageProps {
    textSize: string;
}
  
const WelcomeMessage: React.FC<WelcomeMessageProps> = ({ textSize }) => {
    const { t, i18n } = useTranslation();
    const textClass = textSize === 'large' ? 'text-base' : 'text-sm';
    const formattedTimestamp = new Date().toLocaleTimeString(i18n.language.split('-')[0], {
        hour: '2-digit', minute: '2-digit'
    });
    return (
        <div className="flex items-end space-x-2 rtl:space-x-reverse justify-start">
            <SageAvatarIcon />
            <div className="p-3 rounded-lg max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl bg-sky-800/75 backdrop-blur-sm shadow-lg text-slate-50 relative group">
                <p className={`${textClass}`} style={{ whiteSpace: 'pre-wrap' }}>{t('welcomeMessage')}</p>
                <p className="text-xs mt-1 text-sky-300 text-opacity-80">{formattedTimestamp}</p>
            </div>
        </div>
    );
};

export default WelcomeMessage;
