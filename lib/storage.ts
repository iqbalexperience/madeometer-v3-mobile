import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
    async getItem(key: string): Promise<string | null> {
        try {
            return await AsyncStorage.getItem(key);
        } catch {
            return null;
        }
    },

    async setItem(key: string, value: string): Promise<void> {
        try {
            await AsyncStorage.setItem(key, value);
        } catch {
            // silently fail
        }
    },

    async removeItem(key: string): Promise<void> {
        try {
            await AsyncStorage.removeItem(key);
        } catch {
            // silently fail
        }
    },

    async getJSON<T>(key: string): Promise<T | null> {
        const raw = await this.getItem(key);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as T;
        } catch {
            return null;
        }
    },

    async setJSON<T>(key: string, value: T): Promise<void> {
        await this.setItem(key, JSON.stringify(value));
    },
};
