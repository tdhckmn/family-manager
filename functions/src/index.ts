import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";

admin.initializeApp();
const db = admin.firestore();

// ── Stripe client ────────────────────────────────────────────────────────────
// Set these before deploying:
//   firebase functions:config:set stripe.secret="sk_live_..." stripe.webhook_secret="whsec_..."
const stripeSecret = functions.config().stripe?.secret ?? "";
const webhookSecret = functions.config().stripe?.webhook_secret ?? "";

const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });

// ── createCheckoutSession ─────────────────────────────────────────────────────
// Called from the client to generate a Stripe Checkout URL.
// Pass { priceId, email, uid } in the request body.
export const createCheckoutSession = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  const { priceId, email, uid, successUrl, cancelUrl } = req.body as {
    priceId: string; email: string; uid: string;
    successUrl: string; cancelUrl: string;
  };

  if (!priceId || !uid) { res.status(400).json({ error: "Missing priceId or uid" }); return; }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl ?? `${req.headers.origin}/home?subscribed=1`,
      cancel_url: cancelUrl ?? `${req.headers.origin}/subscribe`,
      metadata: { uid },
      subscription_data: { metadata: { uid } },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// ── stripeWebhook ─────────────────────────────────────────────────────────────
// Receives Stripe events and updates Firestore subscription docs.
// Configure the Stripe webhook endpoint to: https://<region>-<project>.cloudfunctions.net/stripeWebhook
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature failed:", err);
    res.status(400).send("Webhook signature verification failed");
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const uid = session.metadata?.uid;
        if (!uid || !session.subscription) break;

        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        await updateSubscription(uid, sub, session.customer as string);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const uid = sub.metadata?.uid;
        if (!uid) break;
        await updateSubscription(uid, sub, sub.customer as string);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const uid = sub.metadata?.uid;
        if (!uid) break;
        await db.doc(`users/${uid}/subscription`).set({
          status: "cancelled",
          stripeCustomerId: sub.customer,
          stripeSubscriptionId: sub.id,
          currentPeriodEnd: null,
        }, { merge: true });
        await db.doc(`registrations/${uid}`).set({ subStatus: "cancelled" }, { merge: true });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        if (!subId) break;
        const sub = await stripe.subscriptions.retrieve(subId);
        const uid = sub.metadata?.uid;
        if (!uid) break;
        await db.doc(`users/${uid}/subscription`).set({ status: "past_due" }, { merge: true });
        await db.doc(`registrations/${uid}`).set({ subStatus: "past_due" }, { merge: true });
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    res.status(500).send("Webhook handler failed");
  }
});

async function updateSubscription(uid: string, sub: Stripe.Subscription, customerId: string) {
  const periodEnd = new Date(sub.current_period_end * 1000).toISOString();
  const status = sub.status === "active" ? "active" : sub.status === "trialing" ? "trialing" : sub.status;

  await db.doc(`users/${uid}/subscription`).set({
    status,
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    currentPeriodEnd: periodEnd,
    trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
  }, { merge: true });

  await db.doc(`registrations/${uid}`).set({ subStatus: status }, { merge: true });
}
