export type TraditionId =
  | "Stoic" | "Taoist" | "Islam" | "Christian" | "Jewish" | "Buddhist"
  | "Hindu" | "Sufi" | "Confucian" | "Sikh" | "Zen" | "Existentialist" | "Norse";

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
  description: string;
}

export const TRADITION_INFO: Record<TraditionId, TraditionMeta> = {
  Stoic: {
    id: "Stoic", label: "Stoicism", tagline: "The Stoics",
    subtitle: "Roman Virtue · Inner Fortitude", color: "#c47858",
    description: "Born in Athens and refined by Roman thinkers like Marcus Aurelius, Epictetus, and Seneca, Stoicism teaches that virtue is the only true good. By distinguishing what lies within our control — our thoughts, intentions, and responses — from everything outside it, the Stoics built a philosophy of unshakeable inner freedom.",
  },
  Taoist: {
    id: "Taoist", label: "Taoism", tagline: "The Tao",
    subtitle: "Ancient Balance · Wu Wei", color: "#46b6ad",
    description: "The Tao Te Ching, attributed to the sage Lao Tzu in ancient China, honors the Tao — the ineffable Way underlying all existence — and teaches Wu Wei, the art of non-striving action that moves with the grain of nature rather than against it.",
  },
  Islam: {
    id: "Islam", label: "Islam", tagline: "Al-Islam",
    subtitle: "Divine Wisdom · The Straight Path", color: "#4aaa80",
    description: "One of the world's great monotheistic faiths, Islam calls all of humanity to submission to the One God through righteous action, prayer, gratitude, and service.",
  },
  Christian: {
    id: "Christian", label: "Christianity", tagline: "The Way",
    subtitle: "Sacred Light · Love Thy Neighbor", color: "#d4a45b",
    description: "Rooted in the life and teachings of Jesus of Nazareth, Christianity proclaims a God of infinite love who calls all people toward grace, forgiveness, and transformation.",
  },
  Jewish: {
    id: "Jewish", label: "Judaism", tagline: "The Torah",
    subtitle: "Ancient Covenant · Tikkun Olam", color: "#5b8fd4",
    description: "One of humanity's oldest living traditions, Judaism emerged from the covenant between God and Abraham. Concepts like Teshuvah, Tikkun Olam, and Tzedakah remain among history's most profound guides for living justly and lovingly.",
  },
  Buddhist: {
    id: "Buddhist", label: "Buddhism", tagline: "The Dharma",
    subtitle: "The Middle Way · Noble Truths", color: "#a78bfa",
    description: "Founded by Siddhartha Gautama in ancient India, Buddhism offers a clear-eyed path to liberation from suffering through wisdom, ethical conduct, and meditative practice.",
  },
  Hindu: {
    id: "Hindu", label: "Hinduism", tagline: "Sanatana Dharma",
    subtitle: "Upanishads · Bhagavad Gita", color: "#f4844a",
    description: "Hinduism is the world's oldest living spiritual tradition — a vast tapestry of philosophy, devotion, and practice spanning more than four thousand years.",
  },
  Sufi: {
    id: "Sufi", label: "Sufism", tagline: "The Mystics",
    subtitle: "Rumi · Divine Love · Annihilation", color: "#d478a8",
    description: "Sufism is the mystical heart of Islam, a tradition of ardent lovers seeking union with the Divine through love, beauty, and the dissolution of the separate self.",
  },
  Confucian: {
    id: "Confucian", label: "Confucianism", tagline: "The Analects",
    subtitle: "Virtue · Ritual · Benevolence", color: "#74b862",
    description: "Founded by Kong Qiu (Confucius) in 5th-century BCE China, Confucianism is a philosophy of human relationships, moral cultivation, and social harmony.",
  },
  Sikh: {
    id: "Sikh", label: "Sikhism", tagline: "Waheguru",
    subtitle: "Guru Granth Sahib · Seva", color: "#4ab4d4",
    description: "Founded by Guru Nanak in 15th-century Punjab, Sikhism is a path of devotion to the One God, service to all people, and honest, courageous living.",
  },
  Zen: {
    id: "Zen", label: "Zen", tagline: "Just This",
    subtitle: "Direct Experience · No-Mind", color: "#8cb0a0",
    description: "Born from the meeting of Buddhism with Chinese Taoism, Zen cuts through conceptual elaboration to point directly at the reality of this moment.",
  },
  Existentialist: {
    id: "Existentialist", label: "Existentialism", tagline: "Existence First",
    subtitle: "Frankl · Camus · Authentic Being", color: "#9898c0",
    description: "Existentialism arose to confront the deepest questions of human freedom, meaning, and responsibility with unflinching honesty.",
  },
  Norse: {
    id: "Norse", label: "Norse / Havamal", tagline: "Havamal",
    subtitle: "Odin's Wisdom · The High One", color: "#8090a8",
    description: "The Havamal ('Sayings of the High One') is a collection of ancient Norse wisdom attributed to Odin, preserved in the 13th-century Poetic Edda.",
  },
};

export const TRADITION_ORDER: TraditionId[] = [
  "Buddhist", "Christian", "Confucian", "Existentialist", "Hindu",
  "Islam", "Jewish", "Norse", "Sikh", "Stoic", "Sufi", "Taoist", "Zen",
];

export const WISDOM: Quote[] = [
  // ── Stoic ──────────────────────────────────────────────────────────────────
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

  // ── Taoist ─────────────────────────────────────────────────────────────────
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

  // ── Islam ──────────────────────────────────────────────────────────────────
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

  // ── Christian ──────────────────────────────────────────────────────────────
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

  // ── Jewish ─────────────────────────────────────────────────────────────────
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

  // ── Buddhist ───────────────────────────────────────────────────────────────
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

  // ── Hindu ──────────────────────────────────────────────────────────────────
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

  // ── Sufi ───────────────────────────────────────────────────────────────────
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

  // ── Confucian ──────────────────────────────────────────────────────────────
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius", tradition: "Confucian" },
  { text: "One who moves a mountain begins by carrying away small stones.", author: "Confucius", tradition: "Confucian" },
  { text: "Life is really simple, but we insist on making it complicated.", author: "Confucius", tradition: "Confucian" },
  { text: "The wise are modest in speech but exceed in their actions.", author: "Confucius", tradition: "Confucian" },
  { text: "To learn without thinking is labor lost; to think without learning is dangerous.", author: "Confucius, Analects 2:15", tradition: "Confucian" },
  { text: "When you know a thing, to hold that you know it; when you do not know it, to allow that you do not know it — this is knowledge.", author: "Confucius", tradition: "Confucian" },
  { text: "Hold faithfulness and sincerity as first principles.", author: "Confucius, Analects 1:8", tradition: "Confucian" },
  { text: "One of virtue, wishing to be established, seeks also to establish others.", author: "Confucius, Analects 6:28", tradition: "Confucian" },
  { text: "I daily examine myself on three points: whether in transacting business for others I may have been unfaithful; whether in intercourse with friends I may have been insincere; whether I may have failed to master and practice my teacher's instructions.", author: "Confucius, Analects 1:4", tradition: "Confucian" },

  // ── Sikh ───────────────────────────────────────────────────────────────────
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

  // ── Zen ────────────────────────────────────────────────────────────────────
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

  // ── Existentialist ─────────────────────────────────────────────────────────
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

  // ── Norse ──────────────────────────────────────────────────────────────────
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

export function getDayOfYear(): number {
  const now = new Date();
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

export function quoteOfDay(
  enabledTraditions?: string[],
  disabledQuotes?: string[],
  enabledQuotes?: string[]
): Quote {
  const disabledSet = new Set(disabledQuotes ?? []);
  const enabledSet  = new Set(enabledQuotes ?? []);
  const pool = WISDOM.filter(q => {
    const key = quoteKey(q);
    if (enabledSet.has(key))  return true;
    if (disabledSet.has(key)) return false;
    return enabledTraditions?.length ? enabledTraditions.includes(q.tradition) : true;
  });
  const src = pool.length ? pool : WISDOM;
  return src[getDayOfYear() % src.length];
}
