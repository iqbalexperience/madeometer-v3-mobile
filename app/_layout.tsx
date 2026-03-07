import { Stack } from "expo-router";
import { CommunityDataProvider } from "../contexts/CommunityDataContext";
import { FeatureGateProvider } from "../contexts/FeatureGateContext";
import { LanguageProvider } from "../contexts/LanguageContext";

export default function RootLayout() {
    return (
        <LanguageProvider>
            <FeatureGateProvider>
                <CommunityDataProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="index" />
                    </Stack>
                </CommunityDataProvider>
            </FeatureGateProvider>
        </LanguageProvider>
    );
}
