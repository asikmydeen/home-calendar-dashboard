export type QuoteCategory =
    | 'quran'
    | 'hadith'
    | 'motivational'
    | 'leadership'
    | 'wisdom'
    | 'kids'
    | 'gratitude'
    | 'family';

export interface Quote {
    text: string;
    source: string;
    category: QuoteCategory;
}

export const QUOTE_CATEGORIES: { id: QuoteCategory; label: string; emoji: string }[] = [
    { id: 'quran', label: 'Quran', emoji: '📖' },
    { id: 'hadith', label: 'Hadith', emoji: '🕌' },
    { id: 'motivational', label: 'Motivational', emoji: '💪' },
    { id: 'leadership', label: 'Leadership', emoji: '👑' },
    { id: 'wisdom', label: 'Wisdom', emoji: '🦉' },
    { id: 'kids', label: 'Kids', emoji: '🌟' },
    { id: 'gratitude', label: 'Gratitude', emoji: '🙏' },
    { id: 'family', label: 'Family', emoji: '💕' },
];

export const QUOTES: Quote[] = [
    // Quran
    { text: "Indeed, with hardship comes ease.", source: "Quran 94:6", category: 'quran' },
    { text: "And He found you lost and guided you.", source: "Quran 93:7", category: 'quran' },
    { text: "So remember Me; I will remember you.", source: "Quran 2:152", category: 'quran' },
    { text: "And whoever puts their trust in Allah, He will be enough for them.", source: "Quran 65:3", category: 'quran' },
    { text: "My mercy encompasses all things.", source: "Quran 7:156", category: 'quran' },
    { text: "Do not lose hope in the mercy of Allah.", source: "Quran 39:53", category: 'quran' },
    { text: "Allah does not burden a soul beyond that it can bear.", source: "Quran 2:286", category: 'quran' },
    { text: "And be patient. Indeed, Allah is with the patient.", source: "Quran 8:46", category: 'quran' },

    // Hadith
    { text: "The best among you are those who have the best manners and character.", source: "Sahih Bukhari", category: 'hadith' },
    { text: "Smiling at your brother is charity.", source: "Tirmidhi", category: 'hadith' },
    { text: "The strong person is not the one who can wrestle someone else down. The strong person is the one who can control themselves when angry.", source: "Sahih Bukhari", category: 'hadith' },
    { text: "Whoever is not grateful for small things will not be grateful for big things.", source: "Musnad Ahmad", category: 'hadith' },
    { text: "Make things easy for people, not difficult.", source: "Sahih Bukhari", category: 'hadith' },
    { text: "Kindness is a mark of faith.", source: "Sahih Muslim", category: 'hadith' },

    // Motivational
    { text: "Believe you can and you're halfway there.", source: "Theodore Roosevelt", category: 'motivational' },
    { text: "The only way to do great work is to love what you do.", source: "Steve Jobs", category: 'motivational' },
    { text: "It does not matter how slowly you go as long as you do not stop.", source: "Confucius", category: 'motivational' },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", source: "Winston Churchill", category: 'motivational' },
    { text: "The future belongs to those who believe in the beauty of their dreams.", source: "Eleanor Roosevelt", category: 'motivational' },
    { text: "Start where you are. Use what you have. Do what you can.", source: "Arthur Ashe", category: 'motivational' },
    { text: "Every accomplishment starts with the decision to try.", source: "John F. Kennedy", category: 'motivational' },
    { text: "You are never too old to set another goal or to dream a new dream.", source: "C.S. Lewis", category: 'motivational' },

    // Leadership
    { text: "A leader is one who knows the way, goes the way, and shows the way.", source: "John C. Maxwell", category: 'leadership' },
    { text: "The greatest leader is not the one who does the greatest things, but the one who gets people to do the greatest things.", source: "Ronald Reagan", category: 'leadership' },
    { text: "Leadership is service, not position.", source: "Tim Fargo", category: 'leadership' },
    { text: "Before you are a leader, success is all about growing yourself. When you become a leader, success is all about growing others.", source: "Jack Welch", category: 'leadership' },
    { text: "Lead from the heart, not the head.", source: "Princess Diana", category: 'leadership' },

    // Wisdom
    { text: "The only true wisdom is in knowing you know nothing.", source: "Socrates", category: 'wisdom' },
    { text: "In the middle of difficulty lies opportunity.", source: "Albert Einstein", category: 'wisdom' },
    { text: "Knowing yourself is the beginning of all wisdom.", source: "Aristotle", category: 'wisdom' },
    { text: "The journey of a thousand miles begins with one step.", source: "Lao Tzu", category: 'wisdom' },
    { text: "Yesterday is history, tomorrow is a mystery, today is a gift.", source: "Eleanor Roosevelt", category: 'wisdom' },
    { text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", source: "Ralph Waldo Emerson", category: 'wisdom' },

    // Kids-friendly
    { text: "You're braver than you believe, stronger than you seem, and smarter than you think!", source: "Winnie the Pooh", category: 'kids' },
    { text: "Why fit in when you were born to stand out?", source: "Dr. Seuss", category: 'kids' },
    { text: "Today you are you! That is truer than true! There is no one alive who is you-er than you!", source: "Dr. Seuss", category: 'kids' },
    { text: "You have brains in your head. You have feet in your shoes. You can steer yourself any direction you choose.", source: "Dr. Seuss", category: 'kids' },
    { text: "Always let your conscience be your guide.", source: "Pinocchio", category: 'kids' },
    { text: "Even miracles take a little time.", source: "Cinderella", category: 'kids' },
    { text: "All it takes is faith and trust.", source: "Peter Pan", category: 'kids' },
    { text: "Adventure is out there!", source: "Up", category: 'kids' },
    { text: "To infinity and beyond!", source: "Buzz Lightyear", category: 'kids' },
    { text: "Just keep swimming!", source: "Finding Nemo", category: 'kids' },

    // Gratitude
    { text: "Gratitude turns what we have into enough.", source: "Aesop", category: 'gratitude' },
    { text: "The more grateful I am, the more beauty I see.", source: "Mary Davis", category: 'gratitude' },
    { text: "Gratitude is the fairest blossom which springs from the soul.", source: "Henry Ward Beecher", category: 'gratitude' },
    { text: "When you are grateful, fear disappears and abundance appears.", source: "Tony Robbins", category: 'gratitude' },
    { text: "Gratitude is not only the greatest of virtues but the parent of all others.", source: "Cicero", category: 'gratitude' },
    { text: "Be thankful for what you have; you'll end up having more.", source: "Oprah Winfrey", category: 'gratitude' },

    // Family
    { text: "Family is not an important thing. It's everything.", source: "Michael J. Fox", category: 'family' },
    { text: "The love of a family is life's greatest blessing.", source: "Unknown", category: 'family' },
    { text: "In family life, love is the oil that eases friction.", source: "Friedrich Nietzsche", category: 'family' },
    { text: "Family means no one gets left behind or forgotten.", source: "Lilo & Stitch", category: 'family' },
    { text: "The family is one of nature's masterpieces.", source: "George Santayana", category: 'family' },
    { text: "Home is where the heart is, and my heart is wherever my family is.", source: "Unknown", category: 'family' },
];

export function getQuotesByCategory(category: QuoteCategory): Quote[] {
    return QUOTES.filter(q => q.category === category);
}

export function getRandomQuote(category?: QuoteCategory): Quote {
    const quotes = category ? getQuotesByCategory(category) : QUOTES;
    return quotes[Math.floor(Math.random() * quotes.length)];
}
