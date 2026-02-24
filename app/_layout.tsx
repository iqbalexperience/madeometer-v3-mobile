import { Stack } from "expo-router";
import { FeatureGateProvider } from "../contexts/FeatureGateContext";
import { LanguageProvider } from "../contexts/LanguageContext";

export default function RootLayout() {
    return (
        <LanguageProvider>
            <FeatureGateProvider>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                </Stack>
            </FeatureGateProvider>
        </LanguageProvider>
    );
}
