import { adminClient, multiSessionClient, magicLinkClient, anonymousClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react"
import { toast } from "sonner";
import { stripeClient } from "@better-auth/stripe/client"

export const authClient = createAuthClient({
    baseURL: process.env.BETTER_AUTH_URL,
    plugins: [
        adminClient(),
        multiSessionClient(),
        magicLinkClient(),
        anonymousClient(),
        stripeClient({
            subscription: true //if you want to enable subscription management
        })
    ],
    fetchOptions: {
        onError(e: { error: { status: number } }) {
            if (e?.error?.status === 429) {
                toast.error("Too many requests. Please try again later.");
            }
        },
    },
})

export const { signIn, signUp, signOut, useSession } = authClient