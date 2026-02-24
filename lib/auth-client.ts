import { expoClient } from "@better-auth/expo/client";
import { stripeClient } from "@better-auth/stripe/client";
import { anonymousClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

/**
 * Auth client for the Madeometer mobile app.
 * Points to the existing web backend (Better Auth server).
 * Set EXPO_PUBLIC_BETTER_AUTH_URL in your .env to the deployed server URL.
 */
export const authClient = createAuthClient({
    baseURL: "https://madeometer-v3-production.up.railway.app/",
    plugins: [
        expoClient({
            scheme: "madeometer",
            storagePrefix: "madeometer",
            storage: SecureStore,
        }),
        anonymousClient(),
        stripeClient({
            subscription: true //if you want to enable subscription management
        })

    ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
