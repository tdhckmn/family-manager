/**
 * Equanimity — Stripe Webhook Handler (Cloudflare Worker)
 *
 * Deploy this to a Cloudflare Worker (free tier) to handle Stripe webhook events
 * and update Firestore subscription documents for each customer.
 *
 * Setup:
 * 1. Create a Cloudflare Worker at dash.cloudflare.com → Workers & Pages → Create
 * 2. Paste this file as the worker code
 * 3. Set the following environment variables / secrets in the worker:
 *    - STRIPE_WEBHOOK_SECRET   (from Stripe Dashboard → Webhooks → your endpoint → Signing secret)
 *    - FIREBASE_PROJECT_ID     (your Firebase project ID, e.g. family-manager-7bb7d)
 *    - FIREBASE_CLIENT_EMAIL   (from your Firebase service account JSON)
 *    - FIREBASE_PRIVATE_KEY    (from your Firebase service account JSON — include the full key with \n newlines)
 * 4. In Stripe Dashboard → Webhooks, add a new endpoint pointing to your worker URL
 *    and subscribe to these events:
 *    - customer.subscription.created
 *    - customer.subscription.updated
 *    - customer.subscription.deleted
 *    - invoice.payment_succeeded
 *    - invoice.payment_failed
 * 5. In each Stripe payment link, add metadata: { uid: "<firebase_uid>" }
 *    OR use customer.email to look up users (see the comment below).
 *
 * Note on uid → customer mapping:
 *   The cleanest way is to embed the Firebase uid in the Stripe checkout session
 *   metadata. If using Payment Links (which don't allow dynamic metadata), you'll
 *   need to look up the user by email instead. See lookupUidByEmail() below.
 */

const FIRESTORE_BASE = "https://firestore.googleapis.com/v1/projects";

// ── Stripe signature verification ───────────────────────────────────────────

async function verifyStripeSignature(payload, sigHeader, secret) {
  const parts = sigHeader.split(",").reduce((acc, part) => {
    const [k, v] = part.split("=");
    acc[k] = v;
    return acc;
  }, {});

  const timestamp = parts.t;
  const signatures = Object.entries(parts)
    .filter(([k]) => k === "v1")
    .map(([, v]) => v);

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const hexSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");

  // Constant-time comparison (simple version — for production use a proper implementation)
  if (!signatures.includes(hexSig)) {
    throw new Error("Invalid Stripe signature");
  }

  // Reject events older than 5 minutes
  const eventAge = Math.floor(Date.now() / 1000) - parseInt(timestamp);
  if (eventAge > 300) {
    throw new Error("Stripe webhook timestamp too old");
  }
}

// ── Firebase Admin JWT ───────────────────────────────────────────────────────

async function getFirebaseAccessToken(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  function b64(obj) {
    return btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }

  const headerB64 = b64(header);
  const payloadB64 = b64(payload);
  const toSign = `${headerB64}.${payloadB64}`;

  // Import RSA private key
  const pemContents = privateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(toSign));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${toSign}.${sigB64}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error("Failed to get Firebase access token");
  return tokenData.access_token;
}

// ── Firestore write ──────────────────────────────────────────────────────────

async function updateSubscription(projectId, uid, subData, accessToken) {
  const path = `users/${uid}/sub/info`;
  const url = `${FIRESTORE_BASE}/${projectId}/databases/(default)/documents/${path}`;

  function toFirestoreValue(val) {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === "boolean") return { booleanValue: val };
    if (typeof val === "number") return { doubleValue: val };
    if (typeof val === "string") return { stringValue: val };
    return { stringValue: String(val) };
  }

  const fields = Object.fromEntries(
    Object.entries(subData).filter(([, v]) => v !== undefined).map(([k, v]) => [k, toFirestoreValue(v)])
  );

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore write failed: ${res.status} ${err}`);
  }
}

// ── Look up uid by email (fallback if metadata not set) ──────────────────────
// If you use Stripe Payment Links without custom metadata, you'll need to
// query Firestore to find the user by email. This requires a registry collection.
async function lookupUidByEmail(projectId, email, accessToken) {
  const url = `${FIRESTORE_BASE}/${projectId}/databases/(default)/documents:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: "registry" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "email" },
          op: "EQUAL",
          value: { stringValue: email },
        },
      },
      limit: 1,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) return null;
  const results = await res.json();
  if (!results[0]?.document?.fields?.uid?.stringValue) return null;
  return results[0].document.fields.uid.stringValue;
}

// ── ISO date from Unix timestamp ─────────────────────────────────────────────
function isoDate(ts) {
  return new Date(ts * 1000).toISOString().split("T")[0];
}

// ── Main handler ─────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await request.text();
    const sig = request.headers.get("stripe-signature");

    try {
      await verifyStripeSignature(body, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error("Signature verification failed:", err.message);
      return new Response(`Webhook signature error: ${err.message}`, { status: 400 });
    }

    const event = JSON.parse(body);
    const { type, data } = event;
    const obj = data.object;

    let uid = obj.metadata?.uid || null;
    let accessToken = null;

    // Only process subscription-related events
    const handled = [
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.payment_succeeded",
      "invoice.payment_failed",
    ];
    if (!handled.includes(type)) {
      return new Response("OK", { status: 200 });
    }

    try {
      accessToken = await getFirebaseAccessToken(env.FIREBASE_CLIENT_EMAIL, env.FIREBASE_PRIVATE_KEY);
    } catch (err) {
      console.error("Failed to get Firebase token:", err);
      return new Response("Internal error", { status: 500 });
    }

    // Look up uid from email if not in metadata
    if (!uid && obj.customer_email) {
      uid = await lookupUidByEmail(env.FIREBASE_PROJECT_ID, obj.customer_email, accessToken);
    }
    if (!uid && obj.customer) {
      // Fetch customer from Stripe to get email
      try {
        const custRes = await fetch(`https://api.stripe.com/v1/customers/${obj.customer}`, {
          headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
        });
        const cust = await custRes.json();
        if (cust.email) {
          uid = await lookupUidByEmail(env.FIREBASE_PROJECT_ID, cust.email, accessToken);
        }
      } catch {}
    }

    if (!uid) {
      console.error("Could not determine uid for event", type, "— set metadata.uid on the Stripe checkout session or ensure email is in registry.");
      return new Response("OK — uid not found, skipped", { status: 200 });
    }

    let subData = {};

    if (type === "customer.subscription.created" || type === "customer.subscription.updated") {
      const status = obj.status; // "active" | "trialing" | "canceled" | "past_due" | ...
      subData = {
        status: status === "active" ? "active" : status === "trialing" ? "trialing" : status === "canceled" ? "canceled" : "past_due",
        plan: obj.items?.data?.[0]?.price?.recurring?.interval === "year" ? "yearly" : "monthly",
        stripeCustomerId: obj.customer,
        stripeSubscriptionId: obj.id,
        currentPeriodEnd: isoDate(obj.current_period_end),
        trialEnd: obj.trial_end ? isoDate(obj.trial_end) : null,
        override: false,
      };
    } else if (type === "customer.subscription.deleted") {
      subData = {
        status: "canceled",
        stripeCustomerId: obj.customer,
        stripeSubscriptionId: obj.id,
        currentPeriodEnd: isoDate(obj.current_period_end),
        override: false,
      };
    } else if (type === "invoice.payment_succeeded") {
      // Renew period end from latest invoice
      if (obj.subscription) {
        subData = {
          status: "active",
          stripeCustomerId: obj.customer,
          stripeSubscriptionId: obj.subscription,
          currentPeriodEnd: obj.lines?.data?.[0]?.period?.end ? isoDate(obj.lines.data[0].period.end) : undefined,
        };
      }
    } else if (type === "invoice.payment_failed") {
      subData = {
        status: "past_due",
        stripeCustomerId: obj.customer,
      };
    }

    if (Object.keys(subData).length === 0) {
      return new Response("OK — no update needed", { status: 200 });
    }

    try {
      await updateSubscription(env.FIREBASE_PROJECT_ID, uid, subData, accessToken);
      console.log(`Updated subscription for uid=${uid}, event=${type}`);
      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("Firestore update failed:", err);
      return new Response("Internal error", { status: 500 });
    }
  },
};
