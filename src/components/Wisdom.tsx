// Shared wisdom module — traditions, quotes, SVG icons, WisdomCard, AppIcon, TraditionCard.

import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { usePrefs } from "../prefs";
import { useOverlay } from "../overlay";
import { Icon as UIIcon } from "./Icon";

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
  description: string;
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
      <circle cx="50" cy="50" r="44" fill="none" stroke={color} strokeWidth="4" opacity="0.85"/>
      <path d="M50,6 A22,22,0,0,1,50,50 A22,22,0,0,0,50,94" fill="none" stroke={color} strokeWidth="4" opacity="0.85"/>
      <circle cx="50" cy="28" r="6.5" fill={color} opacity="0.9"/>
      <circle cx="50" cy="72" r="6.5" fill="none" stroke={color} strokeWidth="3.5" opacity="0.8"/>
    </svg>
  );
}

function MountainIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" style={{ display: "block" }}>
      {/* Secondary peak — rounded tip */}
      <path d="M52,80 L70,38 Q74,32 78,38 L96,80"
        stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.55"/>
      {/* Main peak — rounded tip, gentle curves */}
      <path d="M16,80 L44,22 Q50,9 56,22 L84,80"
        stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
      <line x1="6" y1="82" x2="94" y2="82" stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.45"/>
    </svg>
  );
}

function WaveIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" style={{ display: "block" }}>
      <path d="M5,35 C15,18 25,18 35,35 C45,52 55,52 65,35 C75,18 85,18 95,35"
        stroke={color} strokeWidth="5.5" strokeLinecap="round" opacity="0.9"/>
      <path d="M5,55 C15,38 25,38 35,55 C45,72 55,72 65,55 C75,38 85,38 95,55"
        stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.6"/>
      <path d="M5,72 C15,57 25,57 35,72 C45,87 55,87 65,72 C75,57 85,57 95,72"
        stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.35"/>
    </svg>
  );
}

function InfinityIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" style={{ display: "block" }}>
      <path d="M50,50 C42,36 30,28 20,30 C10,32 6,42 6,50 C6,58 10,68 20,70 C30,72 42,64 50,50 C58,36 70,28 80,30 C90,32 94,42 94,50 C94,58 90,68 80,70 C70,72 58,64 50,50"
        stroke={color} strokeWidth="6.5" strokeLinecap="round" opacity="0.9"/>
    </svg>
  );
}

function LeafIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" style={{ display: "block" }}>
      <path d="M50,92 C28,72 22,52 22,36 C22,18 34,8 50,8 C66,8 78,18 78,36 C78,52 72,72 50,92 Z"
        stroke={color} strokeWidth="4.5" strokeLinejoin="round" opacity="0.9"/>
      <line x1="50" y1="92" x2="50" y2="12" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.6"/>
      <line x1="50" y1="52" x2="30" y2="38" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
      <line x1="50" y1="66" x2="70" y2="52" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
    </svg>
  );
}

let _moonUid = 0;

function MoonIcon({ size, color }: { size: number; color: string }) {
  const [maskId] = useState(() => `mn_${++_moonUid}`);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }}>
      <defs>
        <mask id={maskId}>
          <rect width="100" height="100" fill="white"/>
          <circle cx="64" cy="42" r="32" fill="black"/>
        </mask>
      </defs>
      <circle cx="48" cy="50" r="36" fill={color} mask={`url(#${maskId})`} opacity="0.9"/>
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
    description: "Born in Athens and refined by Roman thinkers like Marcus Aurelius, Epictetus, and Seneca, Stoicism teaches that virtue is the only true good. By distinguishing what lies within our control — our thoughts, intentions, and responses — from everything outside it, the Stoics built a philosophy of unshakeable inner freedom. Through daily reflection and service to the whole, the Stoic seeks not to escape difficulty but to meet it with equanimity.",
  },
  Taoist: {
    id: "Taoist", label: "Taoism", tagline: "The Tao",
    subtitle: "Ancient Balance · Wu Wei", color: "#46b6ad", Icon: YinYangIcon,
    description: "The Tao Te Ching, attributed to the sage Lao Tzu in ancient China, is one of the most translated and revered texts in human history. Taoism honors the Tao — the ineffable Way underlying all existence — and teaches Wu Wei, the art of non-striving action that moves with the grain of nature rather than against it. In stillness, simplicity, and surrender to what is, the Taoist discovers that the universe offers everything freely to those who cease grasping.",
  },
  Islam: {
    id: "Islam", label: "Islam", tagline: "Al-Islam",
    subtitle: "Divine Wisdom · The Straight Path", color: "#4aaa80", Icon: CrescentStarIcon,
    description: "One of the world's great monotheistic faiths, Islam calls all of humanity to submission to the One God through righteous action, prayer, gratitude, and service. The Prophet Muhammad (peace be upon him) brought a message of universal mercy, moral clarity, and justice that transformed the ancient world. The Quran and the Hadith together illuminate a path of compassion, mindful devotion, and accountability that guides more than a billion people today.",
  },
  Christian: {
    id: "Christian", label: "Christianity", tagline: "The Way",
    subtitle: "Sacred Light · Love Thy Neighbor", color: "#d4a45b", Icon: CrossIcon,
    description: "Rooted in the life and teachings of Jesus of Nazareth, Christianity proclaims a God of infinite love who calls all people toward grace, forgiveness, and transformation. The Sermon on the Mount offers history's most radical ethical teaching: love your enemies, care for the vulnerable, seek the kingdom within. Christianity has inspired two millennia of art, scholarship, hospitals, and acts of compassion that continue to shape the world.",
  },
  Jewish: {
    id: "Jewish", label: "Judaism", tagline: "The Torah",
    subtitle: "Ancient Covenant · Tikkun Olam", color: "#5b8fd4", Icon: StarOfDavidIcon,
    description: "One of humanity's oldest living traditions, Judaism emerged from the covenant between God and Abraham and the revelation at Sinai, and has endured through extraordinary trials with unbroken vitality. The Torah, Talmud, and rabbinic commentary form a vast ocean of ethical and spiritual wisdom still actively interpreted today. Concepts like Teshuvah (return and repentance), Tikkun Olam (repairing the world), and Tzedakah (righteous generosity) remain among history's most profound guides for living justly and lovingly.",
  },
  Buddhist: {
    id: "Buddhist", label: "Buddhism", tagline: "The Dharma",
    subtitle: "The Middle Way · Noble Truths", color: "#a78bfa", Icon: DharmaWheelIcon,
    description: "Founded by Siddhartha Gautama in ancient India, Buddhism offers a clear-eyed path to liberation from suffering through wisdom, ethical conduct, and meditative practice. The Four Noble Truths diagnose the human condition with compassionate precision, and the Eightfold Path offers a complete way of life — right understanding, intention, speech, action, livelihood, effort, mindfulness, and concentration. Buddhism has flourished across Asia in many forms, each adapting the Dharma to new cultures while preserving its essential liberating insight.",
  },
  Hindu: {
    id: "Hindu", label: "Hinduism", tagline: "Sanatana Dharma",
    subtitle: "Upanishads · Bhagavad Gita", color: "#f4844a", Icon: LotusIcon,
    description: "Hinduism is the world's oldest living spiritual tradition — a vast tapestry of philosophy, devotion, and practice spanning more than four thousand years. From the Upanishadic insight Tat Tvam Asi (That art thou) to the ethical clarity of the Bhagavad Gita's call to selfless action, it explores the deepest questions of existence with unparalleled richness. Multiple paths — Jnana (knowledge), Bhakti (devotion), Karma (action), and Raja (meditation) — honor the full diversity of human temperament on the journey toward the infinite Self.",
  },
  Sufi: {
    id: "Sufi", label: "Sufism", tagline: "The Mystics",
    subtitle: "Rumi · Divine Love · Annihilation", color: "#d478a8", Icon: SufiStarIcon,
    description: "Sufism is the mystical heart of Islam, a tradition of ardent lovers seeking union with the Divine through love, beauty, and the dissolution of the separate self. The great poets Rumi, Hafiz, Ibn Arabi, and Al-Ghazali mapped the soul's interior journey with astonishing depth and beauty. Through music, poetry, contemplative practice, and the guidance of a teacher, Sufism invites the discovery that love is not merely a path to the Divine — it is the Divine itself, endlessly present and endlessly seeking.",
  },
  Confucian: {
    id: "Confucian", label: "Confucianism", tagline: "The Analects",
    subtitle: "Virtue · Ritual · Benevolence", color: "#74b862", Icon: ScrollIcon,
    description: "Founded by Kong Qiu (Confucius) in 5th-century BCE China, Confucianism is a philosophy of human relationships, moral cultivation, and social harmony that has shaped East Asian civilization for 2,500 years. Through the cultivation of Ren (benevolence), Li (ritual propriety), Yi (righteousness), and Zhi (wisdom), Confucius taught that a just and harmonious society grows from individuals who first discipline and develop themselves. The Analects remain among the most widely studied ethical texts in human history.",
  },
  Sikh: {
    id: "Sikh", label: "Sikhism", tagline: "Waheguru",
    subtitle: "Guru Granth Sahib · Seva", color: "#4ab4d4", Icon: KhandaIcon,
    description: "Founded by Guru Nanak in 15th-century Punjab, Sikhism is a path of devotion to the One God (Waheguru), service to all people (Seva), and honest, courageous living. The Guru Granth Sahib — a living scripture containing the wisdom of ten Gurus alongside saints from other traditions — is revered as the eternal living Guru. Sikhism's emphasis on universal equality, the community kitchen (langar) that feeds all regardless of caste or creed, and fearless compassion have made it one of humanity's most beautiful spiritual democracies.",
  },
  Zen: {
    id: "Zen", label: "Zen", tagline: "Just This",
    subtitle: "Direct Experience · No-Mind", color: "#8cb0a0", Icon: EnsoIcon,
    description: "Born from the meeting of Buddhism with Chinese Taoism, Zen cuts through conceptual elaboration to point directly at the reality of this moment. Through zazen (sitting meditation), koans (paradoxical teaching questions), and the guidance of a realized teacher, Zen dismantles the habitual mind until ordinary experience shines with extraordinary clarity. 'Before enlightenment, chop wood, carry water; after enlightenment, chop wood, carry water' — Zen finds the sacred in the everyday, and the everyday in the sacred.",
  },
  Existentialist: {
    id: "Existentialist", label: "Existentialism", tagline: "Existence First",
    subtitle: "Frankl · Camus · Authentic Being", color: "#9898c0", Icon: HorizonIcon,
    description: "Existentialism arose to confront the deepest questions of human freedom, meaning, and responsibility with unflinching honesty. Thinkers like Kierkegaard, Sartre, Camus, and Viktor Frankl refused comfortable consolations, insisting that meaning is not given but created through authentic choice and committed action. Far from despairing, existentialism is a radical affirmation of human dignity — the recognition that even in the most extreme circumstances, the freedom to choose one's response remains.",
  },
  Norse: {
    id: "Norse", label: "Norse / Havamal", tagline: "Havamal",
    subtitle: "Odin's Wisdom · The High One", color: "#8090a8", Icon: ValknuttIcon,
    description: "The Havamal ('Sayings of the High One') is a collection of ancient Norse wisdom attributed to Odin, the Allfather, preserved in the 13th-century Poetic Edda. It offers hard-won counsel on friendship, hospitality, caution, and the pursuit of wisdom — earned through experience, hardship, and honest self-reflection rather than inherited doctrine. The Norse worldview honored courage in the face of fate, loyalty to kin and community, and the lasting worth of a life lived with integrity and purpose.",
  },
};

export const TRADITION_ORDER: TraditionId[] = [
  "Buddhist", "Christian", "Confucian", "Existentialist", "Hindu",
  "Islam", "Jewish", "Norse", "Sikh", "Stoic", "Sufi", "Taoist", "Zen",
];

// ── Zodiac icons ──────────────────────────────────────────────────────────────

function AriesIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" style={{ display: "block" }}>
      <path d="M50,82 L50,46 Q38,16 16,28 Q8,36 14,48" stroke={color} strokeWidth="5.5" strokeLinecap="round" fill="none" opacity="0.9"/>
      <path d="M50,46 Q62,16 84,28 Q92,36 86,48" stroke={color} strokeWidth="5.5" strokeLinecap="round" fill="none" opacity="0.9"/>
    </svg>
  );
}

function TaurusIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" style={{ display: "block" }}>
      <circle cx="50" cy="64" r="24" stroke={color} strokeWidth="5" opacity="0.9"/>
      <path d="M26,48 Q26,18 50,18 Q74,18 74,48" stroke={color} strokeWidth="5.5" strokeLinecap="round" fill="none" opacity="0.85"/>
    </svg>
  );
}

function GeminiIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" style={{ display: "block" }}>
      <line x1="16" y1="18" x2="84" y2="18" stroke={color} strokeWidth="5" strokeLinecap="round" opacity="0.9"/>
      <line x1="16" y1="82" x2="84" y2="82" stroke={color} strokeWidth="5" strokeLinecap="round" opacity="0.9"/>
      <line x1="34" y1="18" x2="34" y2="82" stroke={color} strokeWidth="5" strokeLinecap="round" opacity="0.85"/>
      <line x1="66" y1="18" x2="66" y2="82" stroke={color} strokeWidth="5" strokeLinecap="round" opacity="0.85"/>
    </svg>
  );
}

function CancerIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" style={{ display: "block" }}>
      <path d="M50,46 Q70,46 70,30 Q70,14 50,14 Q34,14 30,26" stroke={color} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.9"/>
      <path d="M50,54 Q30,54 30,70 Q30,86 50,86 Q66,86 70,74" stroke={color} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.9"/>
    </svg>
  );
}

function LeoIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" style={{ display: "block" }}>
      <circle cx="38" cy="58" r="22" stroke={color} strokeWidth="5" opacity="0.9"/>
      <path d="M60,58 Q78,58 78,40 Q78,22 60,20 Q50,20 44,28" stroke={color} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.85"/>
    </svg>
  );
}

function VirgoIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" style={{ display: "block" }}>
      <path d="M14,80 L14,38 Q14,18 28,18 Q42,18 42,38 L42,80" stroke={color} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.9"/>
      <path d="M42,38 Q42,18 58,18 Q72,18 72,38 L72,70 Q72,90 88,86" stroke={color} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.85"/>
    </svg>
  );
}

function LibraIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" style={{ display: "block" }}>
      <path d="M22,52 Q22,26 50,26 Q78,26 78,52" stroke={color} strokeWidth="5.5" strokeLinecap="round" fill="none" opacity="0.9"/>
      <line x1="12" y1="58" x2="88" y2="58" stroke={color} strokeWidth="5" strokeLinecap="round" opacity="0.9"/>
      <line x1="12" y1="76" x2="88" y2="76" stroke={color} strokeWidth="5" strokeLinecap="round" opacity="0.8"/>
    </svg>
  );
}

function ScorpioIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" style={{ display: "block" }}>
      <path d="M10,80 L10,38 Q10,18 26,18 Q42,18 42,38 L42,80" stroke={color} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.9"/>
      <path d="M42,38 Q42,18 58,18 Q74,18 74,38 L74,64" stroke={color} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.85"/>
      <line x1="74" y1="64" x2="90" y2="80" stroke={color} strokeWidth="5" strokeLinecap="round" opacity="0.9"/>
      <polyline points="78,80 90,80 90,68" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9"/>
    </svg>
  );
}

function SagittariusIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" style={{ display: "block" }}>
      <line x1="18" y1="82" x2="82" y2="18" stroke={color} strokeWidth="5" strokeLinecap="round" opacity="0.9"/>
      <polyline points="54,18 82,18 82,46" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9"/>
      <line x1="24" y1="52" x2="76" y2="52" stroke={color} strokeWidth="4.5" strokeLinecap="round" opacity="0.65"/>
    </svg>
  );
}

function CapricornIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" style={{ display: "block" }}>
      <path d="M12,18 L42,68 L72,18" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9"/>
      <path d="M72,18 Q90,18 90,40 Q90,60 72,60 Q54,60 54,78 Q54,92 70,92" stroke={color} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.85"/>
    </svg>
  );
}

function AquariusIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" style={{ display: "block" }}>
      <path d="M10,36 Q22,22 34,36 Q46,50 58,36 Q70,22 90,36" stroke={color} strokeWidth="5.5" strokeLinecap="round" fill="none" opacity="0.9"/>
      <path d="M10,62 Q22,48 34,62 Q46,76 58,62 Q70,48 90,62" stroke={color} strokeWidth="5.5" strokeLinecap="round" fill="none" opacity="0.85"/>
    </svg>
  );
}

function PiscesIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" style={{ display: "block" }}>
      <path d="M64,12 Q90,12 90,50 Q90,88 64,88" stroke={color} strokeWidth="5.5" strokeLinecap="round" fill="none" opacity="0.9"/>
      <path d="M36,12 Q10,12 10,50 Q10,88 36,88" stroke={color} strokeWidth="5.5" strokeLinecap="round" fill="none" opacity="0.9"/>
      <line x1="16" y1="50" x2="84" y2="50" stroke={color} strokeWidth="5" strokeLinecap="round" opacity="0.8"/>
    </svg>
  );
}

// ── App icon registry ─────────────────────────────────────────────────────────

export interface AppIconEntry {
  id: string;
  label: string;
  Icon: React.FC<{ size: number; color: string }>;
}

export const PEACEFUL_ICONS: AppIconEntry[] = [
  { id: "mountain", label: "Mountains", Icon: MountainIcon },
  { id: "wave", label: "Wave", Icon: WaveIcon },
  { id: "infinity", label: "Infinity", Icon: InfinityIcon },
  { id: "leaf", label: "Leaf", Icon: LeafIcon },
  { id: "moon", label: "Moon", Icon: MoonIcon },
];

export const ZODIAC_ICONS: AppIconEntry[] = [
  { id: "zodiac-aries",       label: "Aries",       Icon: AriesIcon },
  { id: "zodiac-taurus",      label: "Taurus",      Icon: TaurusIcon },
  { id: "zodiac-gemini",      label: "Gemini",      Icon: GeminiIcon },
  { id: "zodiac-cancer",      label: "Cancer",      Icon: CancerIcon },
  { id: "zodiac-leo",         label: "Leo",         Icon: LeoIcon },
  { id: "zodiac-virgo",       label: "Virgo",       Icon: VirgoIcon },
  { id: "zodiac-libra",       label: "Libra",       Icon: LibraIcon },
  { id: "zodiac-scorpio",     label: "Scorpio",     Icon: ScorpioIcon },
  { id: "zodiac-sagittarius", label: "Sagittarius", Icon: SagittariusIcon },
  { id: "zodiac-capricorn",   label: "Capricorn",   Icon: CapricornIcon },
  { id: "zodiac-aquarius",    label: "Aquarius",    Icon: AquariusIcon },
  { id: "zodiac-pisces",      label: "Pisces",      Icon: PiscesIcon },
];

export const APP_ICON_REGISTRY: AppIconEntry[] = [
  ...PEACEFUL_ICONS,
  ...TRADITION_ORDER.map(id => ({
    id,
    label: TRADITION_META[id].label,
    Icon: TRADITION_META[id].Icon,
  })),
  ...ZODIAC_ICONS,
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
  { text: "We suffer more often in imagination than in reality. True happiness is to enjoy the present.", author: "Seneca", tradition: "Stoic" },
  { text: "Identify and separate matters so that you can say clearly which are externals and which are choices you control.", author: "Epictetus", tradition: "Stoic" },
  { text: "Those who fear death or external events will never do anything worthy of a free person.", author: "Seneca", tradition: "Stoic" },
  { text: "If it is not right do not do it; if it is not true do not say it.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "Difficulty strengthens the mind, as labor does the body.", author: "Seneca", tradition: "Stoic" },
  { text: "Control thy passions lest they take vengeance on thee.", author: "Epictetus", tradition: "Stoic" },
  { text: "The best revenge is to be unlike the one who performed the injury.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "Associate with people who are likely to improve you.", author: "Seneca", tradition: "Stoic" },
  { text: "We have two ears and one mouth so that we can listen twice as much as we speak.", author: "Zeno of Citium", tradition: "Stoic" },
  { text: "It is not because things are difficult that we do not dare; it is because we do not dare that they are difficult.", author: "Seneca", tradition: "Stoic" },
  { text: "Only the educated and the self-disciplined are truly free.", author: "Epictetus", tradition: "Stoic" },
  { text: "A gem cannot be polished without friction, nor anyone perfected without trials.", author: "Seneca", tradition: "Stoic" },

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
  { text: "Those who conquer others are strong; those who conquer themselves are mighty.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "The usefulness of a pot comes from its emptiness.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Return is the movement of the Tao. Yielding is the way of the Tao.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Water is soft and yielding, yet it wears away the hardest stone.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "The Tao that can be told is not the eternal Tao.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Flow with whatever may happen, and let your mind be free: Stay centered by accepting what you do.", author: "Chuang Tzu", tradition: "Taoist" },
  { text: "To accept being trapped is to be a servant. To live naturally, moving when it is time to move and resting when it is time to rest, is to be free.", author: "Lieh Tzu", tradition: "Taoist" },
  { text: "When you are content to be simply yourself and don't compare or compete, everyone will respect you.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Knowing others is intelligence; knowing yourself is true wisdom.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Those who follow the natural order flow with the current.", author: "Wenzi", tradition: "Taoist" },
  { text: "Great acts are made up of small deeds.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "If you realize that all things change, there is nothing you will try to hold on to.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Care about what other people think and you will always be their prisoner.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Perfect peace and freedom lie in the rejection of artificiality.", author: "Chuang Tzu", tradition: "Taoist" },
  { text: "To know when you have enough is to be rich.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Be content with what you have; rejoice in the way things are.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "The softest things in the world overcome the hardest things in the world.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "The Tao is a vessel that is empty, yet use will not drain it. It is like the deep ancestor of all things.", author: "Lao Tzu", tradition: "Taoist" },

  // ── Islam ─────────────────────────────────────────────────────────────────
  { text: "The best of people are those who bring the most benefit to others.", author: "Prophet Muhammad (pbuh)", tradition: "Islam" },
  { text: "Speak good, or remain silent.", author: "Prophet Muhammad (pbuh)", tradition: "Islam" },
  { text: "God does not burden a soul beyond what it can bear.", author: "Quran 2:286", tradition: "Islam" },
  { text: "Wealth is not in having many possessions, but in being content with what one has.", author: "Prophet Muhammad (pbuh)", tradition: "Islam" },
  { text: "The strong are not those who overpower others, but those who master themselves in anger.", author: "Prophet Muhammad (pbuh)", tradition: "Islam" },
  { text: "Be in this world as a stranger or a traveler passing through.", author: "Prophet Muhammad (pbuh)", tradition: "Islam" },
  { text: "Make things easy, and do not make them difficult.", author: "Prophet Muhammad (pbuh)", tradition: "Islam" },
  { text: "Verily, with hardship comes ease.", author: "Quran 94:5–6", tradition: "Islam" },
  { text: "Whoever is not grateful to people is not grateful to God.", author: "Prophet Muhammad (pbuh)", tradition: "Islam" },
  { text: "God is beautiful and loves beauty.", author: "Prophet Muhammad (pbuh)", tradition: "Islam" },
  { text: "Every act of kindness is a charity.", author: "Prophet Muhammad (pbuh)", tradition: "Islam" },
  { text: "None of you truly believes until you wish for others what you wish for yourself.", author: "Prophet Muhammad (pbuh)", tradition: "Islam" },
  { text: "The best of you are those best to their families.", author: "Prophet Muhammad (pbuh)", tradition: "Islam" },
  { text: "Take benefit of five before five: your youth before your old age, your health before your sickness, your wealth before your poverty, your free time before your preoccupation, and your life before your death.", author: "Prophet Muhammad (pbuh)", tradition: "Islam" },
  { text: "Be mindful of God, and God will protect you.", author: "Prophet Muhammad (pbuh)", tradition: "Islam" },
  { text: "God does not look at your forms or wealth, but rather He looks at your hearts and actions.", author: "Prophet Muhammad (pbuh)", tradition: "Islam" },
  { text: "If you are grateful, I will surely increase you in favor.", author: "Quran 14:7", tradition: "Islam" },
  { text: "Whoever removes a worldly hardship from a believer, God will remove one of their hardships on the Day of Resurrection.", author: "Prophet Muhammad (pbuh)", tradition: "Islam" },
  { text: "Do not lose hope, nor be sad.", author: "Quran 3:139", tradition: "Islam" },
  { text: "Tie your camel, then put your trust in God.", author: "Prophet Muhammad (pbuh)", tradition: "Islam" },

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
  { text: "Blessed are the peacemakers, for they shall be called children of God.", author: "Jesus (Matthew 5:9)", tradition: "Christian" },
  { text: "You are the light of the world. A city set on a hill cannot be hidden.", author: "Jesus (Matthew 5:14)", tradition: "Christian" },
  { text: "Love your enemies and pray for those who persecute you.", author: "Jesus (Matthew 5:44)", tradition: "Christian" },
  { text: "Why do you see the speck in your neighbor's eye, but do not notice the log in your own eye?", author: "Jesus (Matthew 7:3)", tradition: "Christian" },
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
  { text: "As the rivers flowing east and west merge in the sea and become one with it, the wise soul sheds individual being and merges with the Infinite.", author: "Chandogya Upanishad", tradition: "Hindu" },

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
  { text: "One who moves a mountain begins by carrying away small stones.", author: "Confucius", tradition: "Confucian" },
  { text: "Life is really simple, but we insist on making it complicated.", author: "Confucius", tradition: "Confucian" },
  { text: "The wise are modest in speech but exceed in their actions.", author: "Confucius", tradition: "Confucian" },
  { text: "To learn without thinking is labor lost; to think without learning is dangerous.", author: "Confucius, Analects 2:15", tradition: "Confucian" },
  { text: "When you know a thing, to hold that you know it; when you do not know it, to allow that you do not know it — this is knowledge.", author: "Confucius", tradition: "Confucian" },
  { text: "Hold faithfulness and sincerity as first principles.", author: "Confucius, Analects 1:8", tradition: "Confucian" },
  { text: "One of virtue, wishing to be established, seeks also to establish others.", author: "Confucius, Analects 6:28", tradition: "Confucian" },
  { text: "I daily examine myself on three points: whether in transacting business for others I may have been unfaithful; whether in intercourse with friends I may have been insincere; whether I may have failed to master and practice my teacher's instructions.", author: "Confucius, Analects 1:4", tradition: "Confucian" },

  // ── Sikh ──────────────────────────────────────────────────────────────────
  { text: "Speak only that which will bring you honor.", author: "Guru Nanak", tradition: "Sikh" },
  { text: "Even kings and emperors with heaps of wealth and vast dominion cannot compare with an ant filled with the love of God.", author: "Guru Nanak", tradition: "Sikh" },
  { text: "Dwell in peace in the home of your own being, and the Messenger of Death will not be able to touch you.", author: "Guru Nanak", tradition: "Sikh" },
  { text: "Only one who has died while yet alive truly understands what it means to live.", author: "Guru Nanak", tradition: "Sikh" },
  { text: "The world is a garden; the Lord is the gardener. He cherishes all — none neglected.", author: "Guru Granth Sahib", tradition: "Sikh" },
  { text: "Recognize the divine light within all, and do not ask about caste; in the next world there is no caste.", author: "Guru Nanak", tradition: "Sikh" },
  { text: "True it is in the beginning; true through all ages; true it is even now; true it shall ever be.", author: "Guru Nanak, Mul Mantar", tradition: "Sikh" },
  { text: "Let no one be proud of their birth; they alone are truly born who are devoted to the Divine.", author: "Guru Granth Sahib", tradition: "Sikh" },
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
  { text: "Everything can be taken from a person but one thing: the last of the human freedoms — to choose one's attitude in any given set of circumstances, to choose one's own way.", author: "Viktor Frankl", tradition: "Existentialist" },
  { text: "I rebel; therefore I exist.", author: "Albert Camus", tradition: "Existentialist" },
  { text: "We are condemned to be free; once thrown into the world, each person is responsible for everything they do.", author: "Jean-Paul Sartre", tradition: "Existentialist" },

  // ── Norse ─────────────────────────────────────────────────────────────────
  { text: "Cattle die, kinsmen die, even you yourself will die; but the fame of good deeds never dies.", author: "Havamal 76", tradition: "Norse" },
  { text: "One should be moderately wise, not over-wise; happiest are those who know enough.", author: "Havamal 54", tradition: "Norse" },
  { text: "No one should call themselves clever; it is enough not to be a fool.", author: "Havamal", tradition: "Norse" },
  { text: "Better to rise early than to have no life; a wakeful soul wins wealth and wisdom.", author: "Havamal", tradition: "Norse" },
  { text: "The brave will often enough survive where the coward perishes.", author: "Havamal", tradition: "Norse" },
  { text: "Praise a day when it is evening, a sword when it has been tried, ice when you have crossed it.", author: "Havamal 81", tradition: "Norse" },
  { text: "Words that one speaks to another come back, mostly, to plague them.", author: "Havamal", tradition: "Norse" },
  { text: "It is better to fight and fall than to live without hope.", author: "Volsunga Saga", tradition: "Norse" },
  { text: "Wisdom is the best burden for any journey.", author: "Norse proverb", tradition: "Norse" },
  { text: "Give counsel to thyself; look to thyself first before you speak.", author: "Havamal", tradition: "Norse" },
];

// ── Day helpers ───────────────────────────────────────────────────────────────

export function getDayOfYear(): number {
  const now = new Date();
  // Use local month/day to avoid UTC-offset drift and DST ±1h errors.
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.round((now.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function quoteKey(q: Quote): string {
  return `${q.tradition}:${q.text.slice(0, 40)}`;
}

export function isQuoteInLibrary(
  q: Quote,
  prefs: { wisdomTraditions: string[]; disabledQuotes: string[]; enabledQuotes?: string[] }
): boolean {
  const key = quoteKey(q);
  if ((prefs.enabledQuotes ?? []).includes(key)) return true;
  if ((prefs.disabledQuotes ?? []).includes(key)) return false;
  return (prefs.wisdomTraditions ?? []).includes(q.tradition);
}

/** Quote of the day filtered to enabled traditions + non-disabled quotes (falls back to full set). */
export function quoteOfDay(enabledTraditions?: string[], disabledQuotes?: string[], enabledQuotes?: string[]): Quote {
  const disabledSet = new Set(disabledQuotes ?? []);
  const enabledSet  = new Set(enabledQuotes ?? []);
  const pool = WISDOM.filter(q => {
    const key = quoteKey(q);
    if (enabledSet.has(key))   return true;
    if (disabledSet.has(key))  return false;
    return enabledTraditions?.length ? enabledTraditions.includes(q.tradition) : true;
  });
  const src = pool.length ? pool : WISDOM;
  return src[getDayOfYear() % src.length];
}

/**
 * Returns today's quote. Fully deterministic from date + prefs, so the same
 * quote appears on every device for a given user on a given day.
 * Prefs sync from Firestore, so desktop and mobile resolve identically.
 */
export function useDailyQuote(): Quote {
  const { prefs } = usePrefs();
  return useMemo(
    () => quoteOfDay(prefs.wisdomTraditions, prefs.disabledQuotes, prefs.enabledQuotes),
    [prefs],
  );
}

// ── AppIcon — dynamic home-page symbol ────────────────────────────────────────

/** Shows the configured icon, or auto-selects based on traditions. */
export function AppIcon({ size, color, traditions, appIcon }: { size: number; color: string; traditions: string[]; appIcon?: string }) {
  if (appIcon) {
    const entry = APP_ICON_REGISTRY.find(e => e.id === appIcon);
    if (entry) return <entry.Icon size={size} color={color} />;
  }
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
  const [pondering, setPondering] = useState(false);
  const [narrow, setNarrow] = useState(() => window.innerWidth < 600);
  const { prefs, updatePrefs } = usePrefs();

  useEffect(() => {
    const h = () => setNarrow(window.innerWidth < 600);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    if (!pondering) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setPondering(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pondering]);

  useOverlay(pondering && narrow);

  function toggleQuote() {
    const key = quoteKey(quote);
    const inLib = isQuoteInLibrary(quote, prefs);
    const tradOn = prefs.wisdomTraditions.includes(quote.tradition);
    const disabled = prefs.disabledQuotes ?? [];
    const enabled  = prefs.enabledQuotes  ?? [];
    if (inLib) {
      if (tradOn) updatePrefs({ disabledQuotes: [...disabled.filter(k => k !== key), key], enabledQuotes: enabled.filter(k => k !== key) });
      else        updatePrefs({ enabledQuotes: enabled.filter(k => k !== key) });
    } else {
      if (!tradOn) updatePrefs({ enabledQuotes: [...enabled.filter(k => k !== key), key], disabledQuotes: disabled.filter(k => k !== key) });
      else         updatePrefs({ disabledQuotes: disabled.filter(k => k !== key) });
    }
  }

  const inLibrary = isQuoteInLibrary(quote, prefs);
  const DARK_BG  = "#0d1120";
  const DARK_TEXT = "#e2ddd4";
  const DARK_DIM  = "#8a8899";
  const DARK_BDR  = "rgba(255,255,255,0.10)";

  return (
    <>
      <div
        onClick={noLink ? undefined : () => setPondering(true)}
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

      {pondering && (
        <div
          onClick={() => setPondering(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 2000,
            background: narrow ? DARK_BG : "rgba(3,5,20,0.94)",
            backdropFilter: narrow ? undefined : "blur(12px)",
            display: "flex",
            alignItems: narrow ? "stretch" : "center",
            justifyContent: narrow ? "stretch" : "center",
            padding: narrow ? 0 : 24,
          }}>
          <div
            onClick={e => e.stopPropagation()}
            style={narrow ? {
              flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
              background: DARK_BG, padding: "60px 28px 52px", position: "relative",
            } : {
              maxWidth: 640, width: "100%", position: "relative",
              background: DARK_BG, border: `1px solid ${color}40`,
              borderRadius: 24, padding: "48px 40px 36px",
              boxShadow: `0 0 80px ${color}22`,
            }}>
            <div style={{
              position: "absolute", inset: 0, borderRadius: narrow ? 0 : 24,
              background: `radial-gradient(ellipse 60% 50% at 50% 40%, ${color}12, transparent 70%)`,
              pointerEvents: "none",
            }} />

            <button
              onClick={() => setPondering(false)}
              style={{
                position: narrow ? "fixed" : "absolute",
                top: narrow ? 20 : 14, right: narrow ? 20 : 14,
                zIndex: 2001,
                background: narrow ? "rgba(255,255,255,0.08)" : "transparent",
                border: narrow ? "1px solid rgba(255,255,255,0.12)" : "none",
                borderRadius: narrow ? 20 : 0,
                color: DARK_TEXT, fontSize: 18, cursor: "pointer",
                lineHeight: 1, padding: narrow ? "8px 12px" : "4px 8px",
              }}><UIIcon name="x" size={16} /></button>

            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
                <Icon size={narrow ? 22 : 20} color={color} />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color, opacity: 0.85 }}>
                  {tagline}
                </span>
              </div>
              <blockquote style={{
                margin: 0, padding: 0,
                fontSize: narrow ? "clamp(18px, 5.5vw, 26px)" : "clamp(16px, 3vw, 22px)",
                lineHeight: 1.72, color: DARK_TEXT, fontStyle: "italic", fontWeight: 500,
              }}>
                "{quote.text}"
              </blockquote>
              <p style={{ fontSize: narrow ? 15 : 14, color: DARK_DIM, marginTop: 20, marginBottom: 0, fontWeight: 700 }}>
                — {quote.author}
              </p>
            </div>

            <div style={{ position: "relative", marginTop: 28, display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={toggleQuote}
                style={{
                  background: inLibrary ? `${color}20` : "transparent",
                  border: `1.5px solid ${inLibrary ? color + "66" : DARK_BDR}`,
                  borderRadius: 20, padding: "7px 16px",
                  display: "inline-flex", alignItems: "center", gap: 6,
                  cursor: "pointer", fontWeight: 700, fontSize: 13,
                  color: inLibrary ? color : DARK_DIM, transition: "all 0.15s",
                }}>
                <UIIcon name="star" size={14} color={inLibrary ? color : DARK_DIM} style={{ fill: inLibrary ? color : "none" }} />
                {inLibrary ? "In library" : "Add to library"}
              </button>
              <Link
                to="/app/wisdom"
                onClick={() => setPondering(false)}
                style={{
                  marginLeft: "auto", fontSize: 13, fontWeight: 700,
                  color: DARK_DIM, textDecoration: "none",
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "7px 14px",
                  border: `1px solid ${DARK_BDR}`, borderRadius: 20,
                }}>
                Library <UIIcon name="external" size={13} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
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
        padding: "10px 8px 9px",
        background: active ? `${meta.color}14` : hovered ? "var(--surface-hi)" : "var(--surface)",
        border: `1.5px solid ${active ? meta.color + "55" : hovered ? "var(--border-hi)" : "var(--border)"}`,
        borderRadius: 10,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "'Montserrat', sans-serif",
        transition: "all 0.18s",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: "100%",
        boxShadow: active ? `0 2px 14px ${meta.color}15` : "none",
      }}
    >
      {active && (
        <div style={{
          position: "absolute", top: 6, right: 6,
          width: 14, height: 14, borderRadius: "50%",
          background: meta.color,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <UIIcon name="checkMark" size={9} />
        </div>
      )}
      <meta.Icon size={26} color={show ? meta.color : "var(--text-muted)"} />
      <div>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: show ? meta.color : "var(--text)", marginBottom: 1, transition: "color 0.18s", lineHeight: 1.2 }}>
          {meta.tagline}
        </div>
        <div style={{ fontSize: 9, color: "var(--text-muted)", lineHeight: 1.35 }}>
          {meta.subtitle}
        </div>
      </div>
    </button>
  );
}
