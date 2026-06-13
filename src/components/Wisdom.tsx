// Shared wisdom module — traditions, quotes, SVG icons, WisdomCard, AppIcon, TraditionCard.

import { useState } from "react";
import { Link } from "react-router-dom";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TraditionId = "Stoic" | "Taoist" | "Islam" | "Christian" | "Jewish" | "Buddhist" | "Hindu" | "Sufi" | "Confucian" | "Sikh" | "Zen" | "Existentialist" | "Norse";

export interface Quote {
  text: string;
  author: string;
  tradition: TraditionId;
}

export interface TraditionMeta {
  id: TraditionId;
  label: string;
  tagline: string;
  subtitle: string;
  color: string;
  Icon: React.FC<{ size: number; color: string }>;
}

// ── SVG Symbol Components ─────────────────────────────────────────────────────

function StoicIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" style={{ display: "block" }}>
      <polygon points="8,32 50,8 92,32" stroke={color} strokeWidth="5" strokeLinejoin="round" fill="none" opacity="0.9"/>
      <rect x="10" y="32" width="80" height="9" rx="2" fill={color} opacity="0.85"/>
      <rect x="18" y="41" width="10" height="44" rx="2" fill={color} opacity="0.8"/>
      <rect x="45" y="41" width="10" height="44" rx="2" fill={color} opacity="0.8"/>
      <rect x="72" y="41" width="10" height="44" rx="2" fill={color} opacity="0.8"/>
      <rect x="8" y="85" width="84" height="8" rx="2" fill={color} opacity="0.85"/>
    </svg>
  );
}

function YinYangIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }}>
      <circle cx="50" cy="50" r="45" fill="rgba(0,0,0,0.42)"/>
      <path d="M50,5 A45,45,0,0,1,50,95 Z" fill={color}/>
      <circle cx="50" cy="27.5" r="22.5" fill={color}/>
      <circle cx="50" cy="72.5" r="22.5" fill="rgba(0,0,0,0.42)"/>
      <circle cx="50" cy="27.5" r="7.5" fill="rgba(0,0,0,0.42)"/>
      <circle cx="50" cy="72.5" r="7.5" fill={color}/>
      <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="1.5" opacity="0.55"/>
    </svg>
  );
}

let _crescentUid = 0;

function CrescentStarIcon({ size, color }: { size: number; color: string }) {
  const [maskId] = useState(() => `cm_${++_crescentUid}`);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }}>
      <defs>
        <mask id={maskId}>
          <rect width="100" height="100" fill="white"/>
          <circle cx="58" cy="44" r="30" fill="black"/>
        </mask>
      </defs>
      <circle cx="44" cy="52" r="36" fill={color} mask={`url(#${maskId})`} opacity="0.9"/>
      {/* 5-pointed star: cx=80, cy=20, R=13, r=5 */}
      <polygon
        points="80,7 83,17 94,17 85,24 88,34 80,27 72,34 75,24 66,17 77,17"
        fill={color} opacity="0.9"
      />
    </svg>
  );
}

function CrossIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }}>
      <rect x="43" y="8" width="14" height="84" rx="5" fill={color} opacity="0.9"/>
      <rect x="12" y="28" width="76" height="14" rx="5" fill={color} opacity="0.9"/>
    </svg>
  );
}

function StarOfDavidIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" style={{ display: "block" }}>
      <polygon points="50,8 90,76 10,76" stroke={color} strokeWidth="7" strokeLinejoin="round" opacity="0.9"/>
      <polygon points="50,92 10,24 90,24" stroke={color} strokeWidth="7" strokeLinejoin="round" opacity="0.9"/>
    </svg>
  );
}

function DharmaWheelIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }}>
      <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="6" opacity="0.9"/>
      <circle cx="50" cy="50" r="13" fill="none" stroke={color} strokeWidth="4" opacity="0.8"/>
      <circle cx="50" cy="50" r="6" fill={color} opacity="0.9"/>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * 45 * Math.PI) / 180;
        return (
          <line key={i}
            x1={50 + 15 * Math.cos(a)} y1={50 + 15 * Math.sin(a)}
            x2={50 + 38 * Math.cos(a)} y2={50 + 38 * Math.sin(a)}
            stroke={color} strokeWidth="4.5" opacity="0.85" strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

function LotusIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }}>
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse key={i} cx="50" cy="27" rx="7" ry="22"
          fill={color} opacity={i % 2 === 0 ? "0.85" : "0.6"}
          transform={`rotate(${i * 45}, 50, 50)`} />
      ))}
      <circle cx="50" cy="50" r="11" fill={color} opacity="0.95" />
    </svg>
  );
}

function SufiStarIcon({ size, color }: { size: number; color: string }) {
  const pts = Array.from({ length: 16 }, (_, i) => {
    const r = i % 2 === 0 ? 42 : 20;
    const a = (i * 22.5 - 90) * Math.PI / 180;
    return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }}>
      <polygon points={pts} fill={color} opacity="0.85" />
      <circle cx="50" cy="50" r="9" fill={color} opacity="0.5" />
    </svg>
  );
}

function ScrollIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" style={{ display: "block" }}>
      <rect x="22" y="24" width="56" height="52" rx="3" stroke={color} strokeWidth="5" opacity="0.9" />
      <ellipse cx="50" cy="24" rx="28" ry="9" stroke={color} strokeWidth="4" opacity="0.85" />
      <ellipse cx="50" cy="76" rx="28" ry="9" stroke={color} strokeWidth="4" opacity="0.85" />
      <line x1="34" y1="38" x2="66" y2="38" stroke={color} strokeWidth="3.5" opacity="0.7" strokeLinecap="round" />
      <line x1="34" y1="50" x2="66" y2="50" stroke={color} strokeWidth="3.5" opacity="0.6" strokeLinecap="round" />
      <line x1="34" y1="62" x2="56" y2="62" stroke={color} strokeWidth="3.5" opacity="0.5" strokeLinecap="round" />
    </svg>
  );
}

function KhandaIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" style={{ display: "block" }}>
      <circle cx="50" cy="50" r="36" stroke={color} strokeWidth="5" opacity="0.85" />
      <path d="M50,10 L56,48 L50,82 L44,48 Z" fill={color} opacity="0.9" />
      <path d="M18,18 C28,38 28,62 18,82" stroke={color} strokeWidth="4.5" strokeLinecap="round" opacity="0.8" />
      <path d="M82,18 C72,38 72,62 82,82" stroke={color} strokeWidth="4.5" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

function EnsoIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }}>
      <path d="M55,12 A40,40,0,1,1,45,12" fill="none" stroke={color} strokeWidth="11" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

function HorizonIcon({ size, color }: { size: number; color: string }) {
  const cy = 62;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }}>
      <line x1="8" y1={cy} x2="92" y2={cy} stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      <path d={`M${50 - 30},${cy} A30,30,0,0,1,${50 + 30},${cy}`} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" opacity="0.9" />
      {Array.from({ length: 7 }, (_, i) => {
        const a = ((i / 6) * 180 - 90) * Math.PI / 180;
        return (
          <line key={i}
            x1={50 + 35 * Math.cos(a)} y1={cy + 35 * Math.sin(a)}
            x2={50 + 46 * Math.cos(a)} y2={cy + 46 * Math.sin(a)}
            stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
        );
      })}
    </svg>
  );
}

function ValknuttIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" style={{ display: "block" }}>
      <polygon points="50,8 68,42 32,42" stroke={color} strokeWidth="5.5" strokeLinejoin="round" opacity="0.9" />
      <polygon points="24,50 60,50 42,84" stroke={color} strokeWidth="5.5" strokeLinejoin="round" opacity="0.85" />
      <polygon points="58,50 94,50 76,84" stroke={color} strokeWidth="5.5" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
}

// ── Tradition Metadata ─────────────────────────────────────────────────────────

export const TRADITION_META: Record<TraditionId, TraditionMeta> = {
  Stoic: {
    id: "Stoic", label: "Stoicism", tagline: "The Stoics",
    subtitle: "Roman Virtue · Inner Fortitude", color: "#c47858", Icon: StoicIcon,
  },
  Taoist: {
    id: "Taoist", label: "Taoism", tagline: "The Tao",
    subtitle: "Ancient Balance · Wu Wei", color: "#46b6ad", Icon: YinYangIcon,
  },
  Islam: {
    id: "Islam", label: "Islam", tagline: "Al-Islam",
    subtitle: "Divine Wisdom · The Straight Path", color: "#4aaa80", Icon: CrescentStarIcon,
  },
  Christian: {
    id: "Christian", label: "Christianity", tagline: "The Way",
    subtitle: "Sacred Light · Love Thy Neighbor", color: "#d4a45b", Icon: CrossIcon,
  },
  Jewish: {
    id: "Jewish", label: "Judaism", tagline: "The Torah",
    subtitle: "Ancient Covenant · Tikkun Olam", color: "#5b8fd4", Icon: StarOfDavidIcon,
  },
  Buddhist: {
    id: "Buddhist", label: "Buddhism", tagline: "The Dharma",
    subtitle: "The Middle Way · Noble Truths", color: "#a78bfa", Icon: DharmaWheelIcon,
  },
  Hindu: {
    id: "Hindu", label: "Hinduism", tagline: "Sanatana Dharma",
    subtitle: "Upanishads · Bhagavad Gita", color: "#f4844a", Icon: LotusIcon,
  },
  Sufi: {
    id: "Sufi", label: "Sufism", tagline: "The Mystics",
    subtitle: "Rumi · Divine Love · Annihilation", color: "#d478a8", Icon: SufiStarIcon,
  },
  Confucian: {
    id: "Confucian", label: "Confucianism", tagline: "The Analects",
    subtitle: "Virtue · Ritual · Benevolence", color: "#74b862", Icon: ScrollIcon,
  },
  Sikh: {
    id: "Sikh", label: "Sikhism", tagline: "Waheguru",
    subtitle: "Guru Granth Sahib · Seva", color: "#4ab4d4", Icon: KhandaIcon,
  },
  Zen: {
    id: "Zen", label: "Zen", tagline: "Just This",
    subtitle: "Direct Experience · No-Mind", color: "#8cb0a0", Icon: EnsoIcon,
  },
  Existentialist: {
    id: "Existentialist", label: "Existentialism", tagline: "Existence First",
    subtitle: "Frankl · Camus · Authentic Being", color: "#9898c0", Icon: HorizonIcon,
  },
  Norse: {
    id: "Norse", label: "Norse / Havamal", tagline: "Havamal",
    subtitle: "Odin's Wisdom · The High One", color: "#8090a8", Icon: ValknuttIcon,
  },
};

export const TRADITION_ORDER: TraditionId[] = [
  "Stoic", "Taoist", "Islam", "Christian", "Jewish", "Buddhist",
  "Hindu", "Sufi", "Confucian", "Sikh", "Zen", "Existentialist", "Norse",
];

// ── Quotes ────────────────────────────────────────────────────────────────────

export const WISDOM: Quote[] = [
  // ── Stoic ─────────────────────────────────────────────────────────────────
  { text: "You have power over your mind, not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "Waste no more time arguing about what a good person should be. Be one.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "The happiness of your life depends upon the quality of your thoughts.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "Be tolerant with others and strict with yourself.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "Receive without pride, relinquish without struggle.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "Very little is needed to make a happy life; it is all within yourself, in your way of thinking.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "Never let the future disturb you. You will meet it with the same weapons of reason that arm you today.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "Dwell on the beauty of life. Watch the stars, and see yourself running with them.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "It never ceases to amaze me: we all love ourselves more than other people, but care more about their opinion than our own.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "Confine yourself to the present.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "You become what you give your attention to.", author: "Epictetus", tradition: "Stoic" },
  { text: "Wealth consists not in having great possessions, but in having few wants.", author: "Epictetus", tradition: "Stoic" },
  { text: "None are free who are not masters of themselves.", author: "Epictetus", tradition: "Stoic" },
  { text: "First say to yourself what you would be; and then do what you have to do.", author: "Epictetus", tradition: "Stoic" },
  { text: "How long are you going to wait before you demand the best for yourself?", author: "Epictetus", tradition: "Stoic" },
  { text: "If you want to improve, be content to be thought foolish and stupid.", author: "Epictetus", tradition: "Stoic" },
  { text: "Make the best use of what is in your power, and take the rest as it happens.", author: "Epictetus", tradition: "Stoic" },
  { text: "Loss is nothing else but change, and change is Nature's delight.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "It's not what happens to you, but how you react to it that matters.", author: "Epictetus", tradition: "Stoic" },

  // ── Taoist ────────────────────────────────────────────────────────────────
  { text: "Nature does not hurry, yet everything is accomplished.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Knowing others is wisdom. Knowing yourself is enlightenment.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "When you realize there is nothing lacking, the whole world belongs to you.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Life is a series of natural and spontaneous changes. Don't resist them.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "To the mind that is still, the whole universe surrenders.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Do you have the patience to wait until your mud settles and the water is clear?", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Simplicity, patience, compassion. These three are your greatest treasures.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Act without expectation.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "At the center of your being you have the answer; you know who you are and you know what you want.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Those who know do not speak. Those who speak do not know.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "The journey of a thousand miles begins with a single step.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "One with outward courage dares to die; one with inner courage dares to live.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "When I let go of what I am, I become what I might be.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Doing nothing is better than being busy doing nothing.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "The flame that burns twice as bright burns half as long.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "He who conquers others is strong; he who conquers himself is mighty.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "The usefulness of a pot comes from its emptiness.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Return is the movement of the Tao. Yielding is the way of the Tao.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Water is soft and yielding, yet it wears away the hardest stone.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "The Tao that can be told is not the eternal Tao.", author: "Lao Tzu", tradition: "Taoist" },

  // ── Islam ─────────────────────────────────────────────────────────────────
  { text: "The best of people are those who bring the most benefit to others.", author: "Prophet Muhammad", tradition: "Islam" },
  { text: "Speak good, or remain silent.", author: "Prophet Muhammad", tradition: "Islam" },
  { text: "God does not burden a soul beyond what it can bear.", author: "Quran 2:286", tradition: "Islam" },
  { text: "Wealth is not in having many possessions, but in being content with what one has.", author: "Prophet Muhammad", tradition: "Islam" },
  { text: "The strong are not those who overpower others, but those who master themselves in anger.", author: "Prophet Muhammad", tradition: "Islam" },
  { text: "Be in this world as a stranger or a traveler passing through.", author: "Prophet Muhammad", tradition: "Islam" },
  { text: "Make things easy, and do not make them difficult.", author: "Prophet Muhammad", tradition: "Islam" },
  { text: "Verily, with hardship comes ease.", author: "Quran 94:5–6", tradition: "Islam" },
  { text: "Whoever is not grateful to people is not grateful to God.", author: "Prophet Muhammad", tradition: "Islam" },
  { text: "God is beautiful and loves beauty.", author: "Prophet Muhammad", tradition: "Islam" },
  { text: "Every act of kindness is a charity.", author: "Prophet Muhammad", tradition: "Islam" },
  { text: "None of you truly believes until he wishes for his brother what he wishes for himself.", author: "Prophet Muhammad", tradition: "Islam" },
  { text: "The best of you are those best to their families.", author: "Prophet Muhammad", tradition: "Islam" },
  { text: "Take benefit of five before five: your youth before your old age, your health before your sickness, your wealth before your poverty, your free time before your preoccupation, and your life before your death.", author: "Prophet Muhammad", tradition: "Islam" },
  { text: "Be mindful of God, and God will protect you.", author: "Prophet Muhammad", tradition: "Islam" },
  { text: "God does not look at your forms or wealth, but rather He looks at your hearts and actions.", author: "Prophet Muhammad", tradition: "Islam" },
  { text: "If you are grateful, I will surely increase you in favor.", author: "Quran 14:7", tradition: "Islam" },
  { text: "Whoever removes a worldly hardship from a believer, God will remove one of his hardships on the Day of Resurrection.", author: "Prophet Muhammad", tradition: "Islam" },
  { text: "Do not lose hope, nor be sad.", author: "Quran 3:139", tradition: "Islam" },
  { text: "Tie your camel, then put your trust in God.", author: "Prophet Muhammad", tradition: "Islam" },

  // ── Christian ─────────────────────────────────────────────────────────────
  { text: "Do to others as you would have them do to you.", author: "Jesus (Luke 6:31)", tradition: "Christian" },
  { text: "Love your neighbor as yourself.", author: "Jesus (Matthew 22:39)", tradition: "Christian" },
  { text: "Do not worry about tomorrow, for tomorrow will worry about itself.", author: "Matthew 6:34", tradition: "Christian" },
  { text: "Ask and it will be given to you; seek and you will find.", author: "Matthew 7:7", tradition: "Christian" },
  { text: "The truth will set you free.", author: "John 8:32", tradition: "Christian" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged.", author: "Joshua 1:9", tradition: "Christian" },
  { text: "Whatever you do, do it with all your heart.", author: "Colossians 3:23", tradition: "Christian" },
  { text: "God opposes the proud but gives grace to the humble.", author: "James 4:6", tradition: "Christian" },
  { text: "In everything give thanks.", author: "1 Thessalonians 5:18", tradition: "Christian" },
  { text: "Blessed are the poor in spirit, for theirs is the kingdom of heaven.", author: "Jesus (Matthew 5:3)", tradition: "Christian" },
  { text: "Blessed are the merciful, for they shall receive mercy.", author: "Jesus (Matthew 5:7)", tradition: "Christian" },
  { text: "Blessed are the pure in heart, for they shall see God.", author: "Jesus (Matthew 5:8)", tradition: "Christian" },
  { text: "Blessed are the peacemakers, for they shall be called sons of God.", author: "Jesus (Matthew 5:9)", tradition: "Christian" },
  { text: "You are the light of the world. A city set on a hill cannot be hidden.", author: "Jesus (Matthew 5:14)", tradition: "Christian" },
  { text: "Love your enemies and pray for those who persecute you.", author: "Jesus (Matthew 5:44)", tradition: "Christian" },
  { text: "Why do you see the speck in your brother's eye, but do not notice the log that is in your own eye?", author: "Jesus (Matthew 7:3)", tradition: "Christian" },
  { text: "Come to me, all who labor and are heavy laden, and I will give you rest.", author: "Jesus (Matthew 11:28)", tradition: "Christian" },
  { text: "The greatest among you shall be your servant.", author: "Jesus (Matthew 23:11)", tradition: "Christian" },
  { text: "The kingdom of God is within you.", author: "Jesus (Luke 17:21)", tradition: "Christian" },
  { text: "A new commandment I give to you, that you love one another: just as I have loved you.", author: "Jesus (John 13:34)", tradition: "Christian" },

  // ── Jewish ────────────────────────────────────────────────────────────────
  { text: "If I am not for myself, who will be? If I am only for myself, what am I? If not now, when?", author: "Hillel (Pirkei Avot 1:14)", tradition: "Jewish" },
  { text: "What is hateful to you, do not do to your neighbor. This is the entire Torah; the rest is commentary.", author: "Hillel", tradition: "Jewish" },
  { text: "Whoever saves a single life, it is as if they have saved an entire world.", author: "Talmud, Sanhedrin 4:5", tradition: "Jewish" },
  { text: "Do not judge your fellow until you have reached their place.", author: "Pirkei Avot 2:4", tradition: "Jewish" },
  { text: "In a place where there are no people, strive to be a person.", author: "Hillel (Pirkei Avot 2:5)", tradition: "Jewish" },
  { text: "Who is wise? One who learns from every person.", author: "Pirkei Avot 4:1", tradition: "Jewish" },
  { text: "Who is mighty? One who conquers their own impulse.", author: "Pirkei Avot 4:1", tradition: "Jewish" },
  { text: "Every person contains a world.", author: "Talmud, Sanhedrin 37a", tradition: "Jewish" },
  { text: "Greet every person with a pleasant countenance.", author: "Pirkei Avot 1:15", tradition: "Jewish" },
  { text: "Each person is obligated to say: the world was created for my sake.", author: "Talmud, Sanhedrin 37a", tradition: "Jewish" },
  { text: "It is not upon you to finish the work, but neither are you free to desist from it.", author: "Pirkei Avot 2:16", tradition: "Jewish" },
  { text: "Who is rich? One who is satisfied with their portion.", author: "Pirkei Avot 4:1", tradition: "Jewish" },
  { text: "The world stands on three things: Torah, service, and acts of loving-kindness.", author: "Pirkei Avot 1:2", tradition: "Jewish" },
  { text: "Love peace and pursue peace.", author: "Hillel (Pirkei Avot 1:12)", tradition: "Jewish" },
  { text: "A person is where their thoughts are.", author: "Rabbi Nachman of Breslov", tradition: "Jewish" },
  { text: "All of Israel are responsible for one another.", author: "Talmud, Shevuot 39a", tradition: "Jewish" },
  { text: "Turn it and turn it again, for everything is in it.", author: "Pirkei Avot 5:22", tradition: "Jewish" },
  { text: "The purpose of all wisdom is repentance and good deeds.", author: "Talmud, Berakhot 17a", tradition: "Jewish" },
  { text: "Do not be wicked in your own eyes.", author: "Pirkei Avot 2:13", tradition: "Jewish" },
  { text: "Be of the disciples of Aaron: love peace, pursue peace, love people, and draw them close to Torah.", author: "Pirkei Avot 1:12", tradition: "Jewish" },

  // ── Buddhist ──────────────────────────────────────────────────────────────
  { text: "The mind is everything. What you think, you become.", author: "Buddha", tradition: "Buddhist" },
  { text: "Peace comes from within. Do not seek it without.", author: "Buddha", tradition: "Buddhist" },
  { text: "Three things cannot be long hidden: the sun, the moon, and the truth.", author: "Buddha", tradition: "Buddhist" },
  { text: "Do not dwell in the past, do not dream of the future; concentrate the mind on the present moment.", author: "Buddha", tradition: "Buddhist" },
  { text: "Holding on to anger is like grasping a hot coal with the intent of throwing it at someone else; you are the one who gets burned.", author: "Buddha", tradition: "Buddhist" },
  { text: "You yourself, as much as anybody in the entire universe, deserve your love and affection.", author: "Buddha", tradition: "Buddhist" },
  { text: "The root of suffering is attachment.", author: "Buddha", tradition: "Buddhist" },
  { text: "Even death is not to be feared by one who has lived wisely.", author: "Buddha", tradition: "Buddhist" },
  { text: "In the end, only three things matter: how much you loved, how gently you lived, and how gracefully you let go.", author: "Buddha", tradition: "Buddhist" },
  { text: "Better it is to live one day seeing the rise and fall of things than to live a hundred years without ever seeing it.", author: "Dhammapada", tradition: "Buddhist" },

  // ── Hindu ─────────────────────────────────────────────────────────────────
  { text: "You have the right to perform your actions, but you are not entitled to the fruits of your actions.", author: "Bhagavad Gita 2:47", tradition: "Hindu" },
  { text: "Let right deeds be thy motive, not the fruit which comes from them.", author: "Bhagavad Gita", tradition: "Hindu" },
  { text: "When meditation is mastered, the mind is unwavering like the flame of a lamp in a windless place.", author: "Bhagavad Gita 6:19", tradition: "Hindu" },
  { text: "The soul is never born nor dies; it is unborn, eternal, ever-existing, ancient. It is not slain when the body is slain.", author: "Bhagavad Gita 2:20", tradition: "Hindu" },
  { text: "Tat Tvam Asi — That art thou.", author: "Chandogya Upanishad 6.8.7", tradition: "Hindu" },
  { text: "The Infinite is bliss. There is no bliss in the small; only in the Infinite is there bliss.", author: "Chandogya Upanishad", tradition: "Hindu" },
  { text: "A person is what their desire is. As is their desire, so is their intention. As is their intention, so is their deed. As is their deed, so is their destiny.", author: "Brihadaranyaka Upanishad 4.4.5", tradition: "Hindu" },
  { text: "The Self is everywhere. It shines through all eyes, breathes through all breath, speaks through all voices.", author: "Upanishads", tradition: "Hindu" },
  { text: "Do your duty without attachment, and you will reach the Highest.", author: "Bhagavad Gita", tradition: "Hindu" },
  { text: "As the rivers flowing east and west merge in the sea and become one with it, the wise man sheds individual being and merges with the Infinite.", author: "Chandogya Upanishad", tradition: "Hindu" },

  // ── Sufi ──────────────────────────────────────────────────────────────────
  { text: "Out beyond ideas of wrongdoing and rightdoing, there is a field. I'll meet you there.", author: "Rumi", tradition: "Sufi" },
  { text: "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.", author: "Rumi", tradition: "Sufi" },
  { text: "The wound is the place where the Light enters you.", author: "Rumi", tradition: "Sufi" },
  { text: "Don't grieve. Anything you lose comes round in another form.", author: "Rumi", tradition: "Sufi" },
  { text: "Sell your cleverness and buy bewilderment. Cleverness is mere opinion; bewilderment brings intuitive knowledge.", author: "Rumi", tradition: "Sufi" },
  { text: "Do not be satisfied with the stories that come before you. Unfold your own myth.", author: "Rumi", tradition: "Sufi" },
  { text: "Even after all this time, the sun never says to the earth: You owe me. Look what happens with a love like that — it lights the whole world.", author: "Hafiz", tradition: "Sufi" },
  { text: "I wish I could show you, when you are lonely or in darkness, the astonishing light of your own being.", author: "Hafiz", tradition: "Sufi" },
  { text: "The heart has eyes which the brain knows nothing of.", author: "Al-Ghazali", tradition: "Sufi" },
  { text: "What you seek is seeking you.", author: "Rumi", tradition: "Sufi" },

  // ── Confucian ─────────────────────────────────────────────────────────────
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius", tradition: "Confucian" },
  { text: "The man who moves a mountain begins by carrying away small stones.", author: "Confucius", tradition: "Confucian" },
  { text: "Life is really simple, but we insist on making it complicated.", author: "Confucius", tradition: "Confucian" },
  { text: "The superior man is modest in his speech, but exceeds in his actions.", author: "Confucius", tradition: "Confucian" },
  { text: "To learn without thinking is labor lost; to think without learning is dangerous.", author: "Confucius, Analects 2:15", tradition: "Confucian" },
  { text: "When you know a thing, to hold that you know it; when you do not know it, to allow that you do not know it — this is knowledge.", author: "Confucius", tradition: "Confucian" },
  { text: "Hold faithfulness and sincerity as first principles.", author: "Confucius, Analects 1:8", tradition: "Confucian" },
  { text: "The man of virtue, wishing to be established himself, seeks also to establish others.", author: "Confucius, Analects 6:28", tradition: "Confucian" },
  { text: "I daily examine myself on three points: whether in transacting business for others I may have been unfaithful; whether in intercourse with friends I may have been insincere; whether I may have failed to master and practice my teacher's instructions.", author: "Confucius, Analects 1:4", tradition: "Confucian" },
  { text: "The gem cannot be polished without friction, nor man perfected without trials.", author: "Chinese proverb", tradition: "Confucian" },

  // ── Sikh ──────────────────────────────────────────────────────────────────
  { text: "Speak only that which will bring you honor.", author: "Guru Nanak", tradition: "Sikh" },
  { text: "Even kings and emperors with heaps of wealth and vast dominion cannot compare with an ant filled with the love of God.", author: "Guru Nanak", tradition: "Sikh" },
  { text: "Dwell in peace in the home of your own being, and the Messenger of Death will not be able to touch you.", author: "Guru Nanak", tradition: "Sikh" },
  { text: "Only one who has died while yet alive truly understands what it means to live.", author: "Guru Nanak", tradition: "Sikh" },
  { text: "The world is a garden; the Lord is the gardener. He cherishes all — none neglected.", author: "Guru Granth Sahib", tradition: "Sikh" },
  { text: "Recognize the divine light within all, and do not ask about caste; in the next world there is no caste.", author: "Guru Nanak", tradition: "Sikh" },
  { text: "True it is in the beginning; true through all ages; true it is even now; true it shall ever be.", author: "Guru Nanak, Mul Mantar", tradition: "Sikh" },
  { text: "Let no one be proud of their birth; he alone is truly born who is devoted to God.", author: "Guru Granth Sahib", tradition: "Sikh" },
  { text: "Whatever you sow, so shall you reap — this is the law written in the human heart.", author: "Guru Granth Sahib", tradition: "Sikh" },
  { text: "Do not practice exploitation; this is the commandment of the Sat Guru.", author: "Guru Granth Sahib", tradition: "Sikh" },

  // ── Zen ───────────────────────────────────────────────────────────────────
  { text: "Before enlightenment, chop wood, carry water. After enlightenment, chop wood, carry water.", author: "Zen proverb", tradition: "Zen" },
  { text: "The present moment is the only moment available to us, and it is the door to all moments.", author: "Thich Nhat Hanh", tradition: "Zen" },
  { text: "If you understand, things are just as they are. If you do not understand, things are just as they are.", author: "Zen saying", tradition: "Zen" },
  { text: "Do not seek the truth; only cease to cherish opinions.", author: "Seng-ts'an, Xinxin Ming", tradition: "Zen" },
  { text: "To study the self is to forget the self.", author: "Dogen, Genjo Koan", tradition: "Zen" },
  { text: "In the beginner's mind there are many possibilities, but in the expert's mind there are few.", author: "Shunryu Suzuki", tradition: "Zen" },
  { text: "Sit quietly, doing nothing. Spring comes, and the grass grows by itself.", author: "Zenrin Kushu", tradition: "Zen" },
  { text: "When walking, walk. When eating, eat.", author: "Zen saying", tradition: "Zen" },
  { text: "The obstacle is the path.", author: "Zen saying", tradition: "Zen" },
  { text: "Not knowing is most intimate.", author: "Dizang, Zen koan", tradition: "Zen" },

  // ── Existentialist ────────────────────────────────────────────────────────
  { text: "Between stimulus and response there is a space. In that space is our power to choose our response. In our response lies our growth and our freedom.", author: "Viktor Frankl", tradition: "Existentialist" },
  { text: "Those who have a 'why' to live can bear with almost any 'how'.", author: "Viktor Frankl", tradition: "Existentialist" },
  { text: "In the middle of winter, I at last discovered that there was in me an invincible summer.", author: "Albert Camus", tradition: "Existentialist" },
  { text: "You will never be happy if you continue to search for what happiness consists of. You will never live if you are looking for the meaning of life.", author: "Albert Camus", tradition: "Existentialist" },
  { text: "Life can only be understood backwards; but it must be lived forwards.", author: "Søren Kierkegaard", tradition: "Existentialist" },
  { text: "Anxiety is the dizziness of freedom.", author: "Søren Kierkegaard", tradition: "Existentialist" },
  { text: "We are our choices.", author: "Jean-Paul Sartre", tradition: "Existentialist" },
  { text: "Everything can be taken from a man but one thing: the last of the human freedoms — to choose one's attitude in any given set of circumstances, to choose one's own way.", author: "Viktor Frankl", tradition: "Existentialist" },
  { text: "I rebel; therefore I exist.", author: "Albert Camus", tradition: "Existentialist" },
  { text: "Man is condemned to be free; because once thrown into the world, he is responsible for everything he does.", author: "Jean-Paul Sartre", tradition: "Existentialist" },

  // ── Norse ─────────────────────────────────────────────────────────────────
  { text: "Cattle die, kinsmen die, even you yourself will die; but the fame of a good man never dies.", author: "Havamal 76", tradition: "Norse" },
  { text: "A man should be moderately wise, not over-wise; he lives the happiest who knows enough.", author: "Havamal 54", tradition: "Norse" },
  { text: "No man should call himself clever; it is enough if he is not a fool.", author: "Havamal", tradition: "Norse" },
  { text: "Better to rise early than to have no life; a wakeful man wins wealth and wisdom.", author: "Havamal", tradition: "Norse" },
  { text: "The brave man often enough will survive where the coward perishes.", author: "Havamal", tradition: "Norse" },
  { text: "Praise a day when it is evening, a sword when it has been tried, ice when you have crossed it.", author: "Havamal 81", tradition: "Norse" },
  { text: "Words that a man speaks to another come back, mostly, to plague him.", author: "Havamal", tradition: "Norse" },
  { text: "It is better to fight and fall than to live without hope.", author: "Volsunga Saga", tradition: "Norse" },
  { text: "Wisdom is the best burden for any journey.", author: "Norse proverb", tradition: "Norse" },
  { text: "Give counsel to thyself; look to thyself first before you speak.", author: "Havamal", tradition: "Norse" },
];

// ── Day helpers ───────────────────────────────────────────────────────────────

export function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
}

/** Quote of the day filtered to enabled traditions + non-disabled quotes (falls back to full set). */
export function quoteOfDay(enabledTraditions?: string[], disabledQuotes?: string[]): Quote {
  const disabledSet = new Set(disabledQuotes ?? []);
  const pool = (enabledTraditions?.length
    ? WISDOM.filter(q => enabledTraditions.includes(q.tradition))
    : WISDOM
  ).filter(q => !disabledSet.has(`${q.tradition}:${q.text.slice(0, 40)}`));
  const src = pool.length ? pool : WISDOM;
  return src[getDayOfYear() % src.length];
}

// ── AppIcon — dynamic home-page symbol ────────────────────────────────────────

/** Shows the active tradition's icon when exactly one is selected; otherwise yin-yang. */
export function AppIcon({ size, color, traditions }: { size: number; color: string; traditions: string[] }) {
  if (traditions.length === 1) {
    const meta = TRADITION_META[traditions[0] as TraditionId];
    if (meta) return <meta.Icon size={size} color={color} />;
  }
  return <YinYangIcon size={size} color={color} />;
}

// ── WisdomCard ────────────────────────────────────────────────────────────────

export function WisdomCard({ quote, compact = false, noLink = false }: { quote: Quote; compact?: boolean; noLink?: boolean }) {
  const meta = TRADITION_META[quote.tradition] ?? TRADITION_META.Stoic;
  const { color, Icon, tagline } = meta;
  const [hov, setHov] = useState(false);

  const card = (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "var(--surface)",
        border: `1px solid ${hov && !noLink ? color + "55" : "var(--border)"}`,
        borderRadius: 16, padding: compact ? "14px 18px" : "22px 28px",
        position: "relative", overflow: "hidden",
        cursor: noLink ? "default" : "pointer",
        transition: "border-color 0.15s",
      }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${color}09 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: compact ? 8 : 12 }}>
          <Icon size={compact ? 15 : 19} color={color} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color, opacity: 0.85 }}>
            {tagline}
          </span>
        </div>
        <p style={{ fontSize: compact ? 13 : 15, lineHeight: 1.65, color: "var(--text)", fontStyle: "italic", margin: 0, maxWidth: 760 }}>
          "{quote.text}"
        </p>
        <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 8, marginBottom: 0, fontWeight: 600 }}>
          — {quote.author}
        </p>
      </div>
    </div>
  );

  if (noLink) return card;
  return <Link to="/app/wisdom" style={{ textDecoration: "none", display: "block" }}>{card}</Link>;
}

// ── TraditionCard — Civ6-inspired selector card ───────────────────────────────

export function TraditionCard({ meta, active, onToggle }: {
  meta: TraditionMeta;
  active: boolean;
  onToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const show = active || hovered;

  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        padding: "16px 14px 14px",
        background: active ? `${meta.color}14` : hovered ? "var(--surface-hi)" : "var(--surface)",
        border: `1.5px solid ${active ? meta.color + "55" : hovered ? "var(--border-hi)" : "var(--border)"}`,
        borderRadius: 14,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "'Montserrat', sans-serif",
        transition: "all 0.18s",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        width: "100%",
        boxShadow: active ? `0 4px 24px ${meta.color}18` : "none",
      }}
    >
      {active && (
        <div style={{
          position: "absolute", top: 8, right: 8,
          width: 17, height: 17, borderRadius: "50%",
          background: meta.color,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ color: "#08101f", fontSize: 10, fontWeight: 900, lineHeight: 1 }}>✓</span>
        </div>
      )}
      <meta.Icon size={36} color={show ? meta.color : "var(--text-muted)"} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: show ? meta.color : "var(--text)", marginBottom: 2, transition: "color 0.18s" }}>
          {meta.tagline}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.4 }}>
          {meta.subtitle}
        </div>
      </div>
    </button>
  );
}
