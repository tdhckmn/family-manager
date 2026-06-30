import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { usePrefs } from "../prefs";
import { useOverlay } from "../overlay";
import { Icon as UIIcon } from "./Icon";
import {
  type TraditionId, type Quote, type TraditionMeta as TraditionMetaBase,
  WISDOM, TRADITION_ORDER, TRADITION_INFO,
  quoteKey, isQuoteInLibrary, quoteOfDay, getDayOfYear,
} from "@equanimity/core";

export type { TraditionId, Quote } from "@equanimity/core";
export { WISDOM, TRADITION_ORDER, quoteKey, isQuoteInLibrary, quoteOfDay } from "@equanimity/core";

export interface TraditionMeta extends TraditionMetaBase {
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
