// Shared Stoic / Taoist daily-wisdom module — used on both the Todos and Finance pages.

const JADE = "#5db88a";
const JADE_DIM = "#3d8a62";
const BORDER = "rgba(255,255,255,0.08)";
const TEXT_DIM = "#7a7890";

export interface Quote { text: string; author: string; tradition: "Stoic" | "Taoist" }

export const WISDOM: Quote[] = [
  { text: "You have power over your mind, not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "Nature does not hurry, yet everything is accomplished.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "Knowing others is wisdom. Knowing yourself is enlightenment.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "The happiness of your life depends upon the quality of your thoughts.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "When you realize there is nothing lacking, the whole world belongs to you.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Be tolerant with others and strict with yourself.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "Life is a series of natural and spontaneous changes. Don't resist them.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "You become what you give your attention to.", author: "Epictetus", tradition: "Stoic" },
  { text: "To the mind that is still, the whole universe surrenders.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Wealth consists not in having great possessions, but in having few wants.", author: "Epictetus", tradition: "Stoic" },
  { text: "Do you have the patience to wait until your mud settles and the water is clear?", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Receive without pride, relinquish without struggle.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "Simplicity, patience, compassion. These three are your greatest treasures.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "No man is free who is not master of himself.", author: "Epictetus", tradition: "Stoic" },
  { text: "Act without expectation.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "First say to yourself what you would be; and then do what you have to do.", author: "Epictetus", tradition: "Stoic" },
  { text: "At the center of your being you have the answer; you know who you are and you know what you want.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Very little is needed to make a happy life; it is all within yourself, in your way of thinking.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "Those who know do not speak. Those who speak do not know.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "The journey of a thousand miles begins with a single step.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Never let the future disturb you. You will meet it, if you have to, with the same weapons of reason that arm you today.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "A man with outward courage dares to die; a man with inner courage dares to live.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Dwell on the beauty of life. Watch the stars, and see yourself running with them.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "The key to growth is the introduction of higher dimensions of consciousness into our awareness.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "If you want to improve, be content to be thought foolish and stupid.", author: "Epictetus", tradition: "Stoic" },
  { text: "Doing nothing is better than being busy doing nothing.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "It never ceases to amaze me: we all love ourselves more than other people, but care more about their opinion than our own.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "When I let go of what I am, I become what I might be.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "How long are you going to wait before you demand the best for yourself?", author: "Epictetus", tradition: "Stoic" },
  { text: "Be careful what you water your dreams with. Water them with worry and fear and you will produce weeds that choke the life from your dream.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Confine yourself to the present.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "The flame that burns twice as bright burns half as long.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Make the best use of what is in your power, and take the rest as it happens.", author: "Epictetus", tradition: "Stoic" },
];

export function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
}

/** The quote for today — stable for the whole calendar day. */
export function quoteOfDay(): Quote {
  return WISDOM[getDayOfYear() % WISDOM.length];
}

export function WisdomCard({ quote, compact = false }: { quote: Quote; compact?: boolean }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${BORDER}`, borderRadius: 16, padding: compact ? "14px 18px" : "22px 28px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(93,184,138,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: compact ? 8 : 12 }}>
          <div style={{ width: 3, height: 12, background: `linear-gradient(180deg, ${JADE}, ${JADE_DIM})`, borderRadius: 2 }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: JADE, opacity: 0.8 }}>
            {quote.tradition}
          </span>
        </div>
        <p style={{ fontSize: compact ? 13 : 15, lineHeight: 1.65, color: "#c8c4b8", fontStyle: "italic", margin: 0, maxWidth: 760 }}>
          "{quote.text}"
        </p>
        <p style={{ fontSize: 12, color: TEXT_DIM, marginTop: 8, marginBottom: 0, fontWeight: 600 }}>
          — {quote.author}
        </p>
      </div>
    </div>
  );
}
