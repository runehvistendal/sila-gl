"use server"

import { revalidatePath } from "next/cache"
import { getAppBaseUrl } from "@/lib/appUrl"
import { createClient } from "@/lib/supabase-server"
import { createServiceClient } from "@/lib/supabase-service"
import { stripe } from "@/lib/stripe"

/** Samme værdi som STRIPE_PUBLISH_REQUIRED_ERROR i klient — må ikke importeres i "use server" fra shared lib */
const STRIPE_REQUIRED = "stripe_required"

export type ConnectResult = { url: string } | { error: string }

export type StripeOnboardingCompleteCheck =
  | { ok: true; complete: boolean }
  | { ok: false; error: string }

export async function checkStripeOnboardingComplete(): Promise<StripeOnboardingCompleteCheck> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) {
    return { ok: false, error: "Ikke logget ind" }
  }

  const { data: sensitiveRaw, error: sensErr } = await supabase.rpc("get_my_sensitive_profile")
  if (sensErr) {
    return { ok: false, error: "Kunne ikke hente profil" }
  }

  const sensitive = sensitiveRaw as { stripe_onboarding_complete?: boolean | null } | null
  return { ok: true, complete: sensitive?.stripe_onboarding_complete === true }
}

export type RequireStripeForPublishResult =
  | { ok: true }
  | { ok: false; error: string }

export async function requireStripeForPublish(): Promise<RequireStripeForPublishResult> {
  const r = await checkStripeOnboardingComplete()
  if (!r.ok) return { ok: false, error: r.error }
  if (!r.complete) return { ok: false, error: STRIPE_REQUIRED }
  return { ok: true }
}

export type GetStripeOnboardingUrlResult =
  | { alreadyComplete: true }
  | { url: string }
  | { error: string }

/**
 * Bruges fra onboarding-modal: hop til Stripe Account Link, eller markér allerede færdig.
 */
export async function getStripeOnboardingUrl(): Promise<GetStripeOnboardingUrlResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { error: "Stripe er ikke konfigureret" }
  }

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) {
    return { error: "Du skal være logget ind" }
  }

  const { data: sensitiveRaw, error: sensErr } = await supabase.rpc("get_my_sensitive_profile")
  if (sensErr) {
    return { error: "Kunne ikke hente profil" }
  }
  const sensitive = sensitiveRaw as { stripe_onboarding_complete?: boolean | null } | null
  if (sensitive?.stripe_onboarding_complete === true) {
    return { alreadyComplete: true }
  }

  const res = await connect()
  if ("error" in res) {
    return { error: res.error }
  }
  return { url: res.url }
}

export type OnboardingStatusResult =
  | { complete: boolean }
  | { error: string }

export async function connect(): Promise<ConnectResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { error: "Stripe er ikke konfigureret (mangler STRIPE_SECRET_KEY)" }
  }

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) {
    return { error: "Du skal være logget ind" }
  }
  const user = session.user

  const [{ data: profile, error: profileError }, { data: sensitiveRaw }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, role_type")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.rpc("get_my_sensitive_profile"),
    ])

  if (profileError || !profile) {
    return { error: "Kunne ikke hente profil" }
  }

  const role = (profile as { role_type?: string }).role_type
  if (role !== "provider" && role !== "both") {
    return { error: "Kun udbydere kan forbinde Stripe" }
  }

  const sensitive = sensitiveRaw as { stripe_account_id?: string | null } | null
  let accountId = sensitive?.stripe_account_id ?? null

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "DK",
      default_currency: "dkk",
      email: user.email ?? undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { supabase_user_id: user.id },
    })
    accountId = account.id

    const service = createServiceClient()
    const { error: upErr } = await service
      .from("profiles")
      .update({
        stripe_account_id: accountId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (upErr) {
      console.error("[stripe connect] service update", upErr)
      return { error: "Kunne ikke gemme Stripe-konto" }
    }
  }

  const base = getAppBaseUrl()
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${base}/profil?stripe=refresh`,
    return_url: `${base}/stripe/return`,
  })

  return { url: accountLink.url }
}

export async function checkOnboardingStatus(): Promise<OnboardingStatusResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { error: "Stripe er ikke konfigureret" }
  }

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) {
    return { error: "Du skal være logget ind" }
  }
  const user = session.user

  const { data: sensitiveRaw, error: profErr } = await supabase.rpc("get_my_sensitive_profile")
  if (profErr) {
    return { error: "Kunne ikke hente profil" }
  }
  const sensitive = sensitiveRaw as { stripe_account_id?: string | null } | null
  const accountId = sensitive?.stripe_account_id ?? null

  if (!accountId) {
    return { complete: false }
  }

  const account = await stripe.accounts.retrieve(accountId)
  const complete = Boolean(
    account.charges_enabled && account.details_submitted,
  )

  if (complete) {
    const service = createServiceClient()
    const { error: upErr } = await service
      .from("profiles")
      .update({
        stripe_onboarding_complete: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (upErr) {
      console.error("[stripe checkOnboardingStatus] service update", upErr)
      return { error: "Kunne ikke opdatere onboarding-status" }
    }

    revalidatePath("/")
    revalidatePath("/profil")
    revalidatePath("/dashboard")
  }

  return { complete }
}
