
import { useState, useEffect } from 'react';

const TEXT_SIZE_STORAGE_KEY = 'appTextSize';

export function useTextSize(): [string, (size: string) => void] {
    const [textSize, setTextSize] = useState<string>(() => {
        try {
            const item = localStorage.getItem(TEXT_SIZE_STORAGE_KEY);
            return item || 'normal';
        } catch (error) {
            console.error(error);
            return 'normal';
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(TEXT_SIZE_STORAGE_KEY, textSize);
        } catch (error) {
            console.error(error);
        }
    }, [textSize]);

    return [textSize, setTextSize];
}
