// Liturgical calendar (Roman Rite, USA), prayers, and the daily Gospel.

import { parseKey } from "./store.js";

const DAY = 86400000;
const atNoon = (y, m, d) => new Date(y, m, d, 12);
const plus = (date, n) => new Date(date.getTime() + n * DAY);
const sameDay = (a, b) => a.toDateString() === b.toDateString();

// Anonymous Gregorian algorithm.
export function easter(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return atNoon(year, month - 1, day);
}

function adventStart(year) {
  const christmas = atNoon(year, 11, 25);
  const fourth = plus(christmas, -(christmas.getDay() || 7));
  return plus(fourth, -21);
}

// USA: Epiphany on the Sunday Jan 2–8; Baptism of the Lord the following Sunday,
// or the Monday after Epiphany when Epiphany falls on Jan 7 or 8.
function baptismOfTheLord(year) {
  let ep = atNoon(year, 0, 2);
  while (ep.getDay() !== 0) ep = plus(ep, 1);
  return ep.getDate() >= 7 ? plus(ep, 1) : plus(ep, 7);
}

export function liturgicalDay(key) {
  const d = parseKey(key);
  d.setHours(12);
  const y = d.getFullYear();
  const E = easter(y);
  const ash = plus(E, -46), holyThu = plus(E, -3), pentecost = plus(E, 49);
  const adv = adventStart(y), bapt = baptismOfTheLord(y);

  let season, color;
  if (d <= bapt) { season = "Christmas"; color = "white"; }
  else if (d < ash) { season = "Ordinary Time"; color = "green"; }
  else if (d < holyThu) { season = "Lent"; color = "violet"; }
  else if (d < E) { season = "Sacred Paschal Triduum"; color = sameDay(d, plus(E, -2)) ? "red" : "white"; }
  else if (d <= pentecost) { season = "Easter"; color = sameDay(d, pentecost) ? "red" : "white"; }
  else if (d < adv) { season = "Ordinary Time"; color = "green"; }
  else if (d.getMonth() === 11 && d.getDate() >= 25) { season = "Christmas"; color = "white"; }
  else { season = "Advent"; color = "violet"; }

  if (sameDay(d, plus(adv, 14)) || sameDay(d, plus(E, -21))) color = "rose"; // Gaudete / Laetare

  const isAsh = sameDay(d, ash), isGoodFriday = sameDay(d, plus(E, -2));
  const friday = d.getDay() === 5;
  return {
    season, color, isAsh, isGoodFriday, friday,
    lent: d >= ash && d < E,
    easterSeason: d >= E && d <= pentecost,
    fastDay: isAsh || isGoodFriday,
    abstinence: isAsh || (friday && d >= ash && d < E),
  };
}

export function penanceNote(lit) {
  if (lit.fastDay) {
    return {
      title: lit.isAsh ? "Ash Wednesday — fast & abstinence" : "Good Friday — fast & abstinence",
      body: "Ages 18–59: one full meal, plus two smaller meals that together don't equal a full one; no snacking. Ages 14+: no meat. Log honestly — today the deficit is a prayer, not a diet.",
    };
  }
  if (lit.abstinence) {
    return { title: "Friday of Lent — abstain from meat", body: "Ages 14+. Fish, eggs, and dairy are fine for protein. Offer the sacrifice for someone specific." };
  }
  if (lit.friday) {
    return {
      title: "Friday — a day of penance",
      body: "Every Friday honors the Passion. In the U.S. you may abstain from meat or choose another real penance (skip the dessert, an extra set offered up, a work of charity). Solemnities that fall on a Friday lift the obligation.",
    };
  }
  return null;
}

// Rosary mysteries by weekday (St. John Paul II, Rosarium Virginis Mariae).
const MYSTERIES = {
  Joyful: ["The Annunciation", "The Visitation", "The Nativity", "The Presentation in the Temple", "The Finding in the Temple"],
  Sorrowful: ["The Agony in the Garden", "The Scourging at the Pillar", "The Crowning with Thorns", "The Carrying of the Cross", "The Crucifixion"],
  Glorious: ["The Resurrection", "The Ascension", "The Descent of the Holy Spirit", "The Assumption", "The Coronation of Mary"],
  Luminous: ["The Baptism of the Lord", "The Wedding at Cana", "The Proclamation of the Kingdom", "The Transfiguration", "The Institution of the Eucharist"],
};
const BY_WEEKDAY = ["Glorious", "Joyful", "Sorrowful", "Glorious", "Luminous", "Sorrowful", "Joyful"];

export function mysteriesFor(key) {
  const set = BY_WEEKDAY[parseKey(key).getDay()];
  return { set, list: MYSTERIES[set] };
}

export const PRAYERS = {
  morningOffering: "O Jesus, through the Immaculate Heart of Mary, I offer You my prayers, works, joys, and sufferings of this day for all the intentions of Your Sacred Heart, in union with the Holy Sacrifice of the Mass throughout the world, in reparation for my sins, for the intentions of all our associates, and in particular for the intentions of the Holy Father this month. Amen.",
  angelus: [
    ["V. The Angel of the Lord declared unto Mary,", "R. And she conceived of the Holy Spirit."],
    ["Hail Mary…", ""],
    ["V. Behold the handmaid of the Lord.", "R. Be it done unto me according to your word."],
    ["Hail Mary…", ""],
    ["V. And the Word was made flesh,", "R. And dwelt among us."],
    ["Hail Mary…", ""],
    ["V. Pray for us, O holy Mother of God,", "R. That we may be made worthy of the promises of Christ."],
    ["Let us pray: Pour forth, we beseech you, O Lord, your grace into our hearts, that we, to whom the Incarnation of Christ your Son was made known by the message of an angel, may by his Passion and Cross be brought to the glory of his Resurrection, through the same Christ our Lord. Amen.", ""],
  ],
  reginaCaeli: [
    ["V. Queen of Heaven, rejoice, alleluia.", "R. For he whom you did merit to bear, alleluia,"],
    ["V. Has risen, as he said, alleluia.", "R. Pray for us to God, alleluia."],
    ["V. Rejoice and be glad, O Virgin Mary, alleluia.", "R. For the Lord has truly risen, alleluia."],
    ["Let us pray: O God, who gave joy to the world through the resurrection of your Son, our Lord Jesus Christ, grant, we beseech you, that through the intercession of the Virgin Mary, his Mother, we may obtain the joys of everlasting life, through the same Christ our Lord. Amen.", ""],
  ],
  athletesOffering: "Lord Jesus, I offer You this workout. Every rep for Your glory, every hard set for the intention I carry today. My body is a temple of Your Holy Spirit; help me train it with discipline, not vanity, so that I may serve You and others with strength. St. Sebastian and St. Pier Giorgio Frassati, pray for me. Amen.",
  stMichael: "St. Michael the Archangel, defend us in battle. Be our protection against the wickedness and snares of the devil. May God rebuke him, we humbly pray; and do thou, O Prince of the heavenly host, by the power of God, cast into hell Satan and all the evil spirits who prowl about the world seeking the ruin of souls. Amen.",
};

export const EXAMEN = [
  ["Presence & gratitude", "Become aware of God with you. Thank Him for three specific gifts from today — a meal, a lift, a person."],
  ["Ask for light", "Ask the Holy Spirit to show you your day as He sees it."],
  ["Review the day", "Walk through the hours. Where did you feel close to God? Where did you drift? Did you treat your body as a temple — at the table and in the gym?"],
  ["Sorrow & mercy", "Name where you fell short — impatience, gluttony, pride in the mirror, neglect of prayer. Ask forgiveness. (Is it time for Confession?)"],
  ["Resolve for tomorrow", "One concrete resolution for tomorrow, for body and for soul."],
];

export const LECTIO = [
  ["Lectio — Read", "Read the Gospel slowly, twice. Which word or phrase catches you?", "word"],
  ["Meditatio — Reflect", "Why that word? What is Christ saying to you, today, in your life?", "meditate"],
  ["Oratio — Respond", "Talk to Him about it, honestly. Write your prayer.", "pray"],
  ["Contemplatio — Rest", "Be still for one minute. No words. Just be with Him.", null],
];

// One virtue a week: each pairs the discipline of the body with the life of the soul.
export const VIRTUES = [
  { name: "Temperance", body: "Hit your calorie target — no more, no less. Stop eating at satisfied, not stuffed.", soul: "Master the appetites so they serve you, not rule you.", verse: "Do you not know that your body is a temple of the holy Spirit within you, whom you have from God, and that you are not your own? … Therefore glorify God in your body.", ref: "1 Corinthians 6:19–20", saint: "St. Pier Giorgio Frassati", quote: "Verso l'alto! — To the heights!" },
  { name: "Fortitude", body: "When the last rep gets hard, finish it with good form. Don't skip the hard lift.", soul: "Courage to do the right thing when it costs you.", verse: "I have the strength for everything through him who empowers me.", ref: "Philippians 4:13", saint: "St. Sebastian, patron of athletes", quote: "He endured arrows and still would not deny Christ." },
  { name: "Prudence", body: "Plan tomorrow's meals and workout tonight. Prep your protein.", soul: "See clearly, judge rightly, then act.", verse: "The naive believe everything, but the shrewd watch their steps.", ref: "Proverbs 14:15", saint: "St. Thomas More", quote: "\"The king's good servant, but God's first.\"" },
  { name: "Justice", body: "Give your body what it's owed: sleep, water, protein, rest days.", soul: "Give God, family, and neighbor what is owed to them.", verse: "You have been told, O mortal, what is good, and what the LORD requires of you: Only to do justice and to love goodness, and to walk humbly with your God.", ref: "Micah 6:8", saint: "St. Joseph the Worker", quote: "Silent, faithful, and strong for those in his care." },
  { name: "Faith", body: "Trust the process: the scale and the bar move slowly. Keep showing up.", soul: "Believe what God has revealed, even when you can't see the results yet.", verse: "Faith is the realization of what is hoped for and evidence of things not seen.", ref: "Hebrews 11:1", saint: "St. John Paul II", quote: "\"Do not be afraid. Open wide the doors for Christ.\"" },
  { name: "Hope", body: "Stalled? Deload, rebuild, and go again. A plateau is not the end.", soul: "Your destiny is heaven. Every effort here is aimed there.", verse: "They that hope in the LORD will renew their strength, they will soar on eagles' wings; they will run and not grow weary, walk and not grow faint.", ref: "Isaiah 40:31", saint: "St. Philip Neri", quote: "\"Cheerfulness strengthens the heart and makes us persevere in a good life.\"" },
  { name: "Charity", body: "Spot someone. Encourage someone at the gym. Cook a healthy meal for your family.", soul: "Love God above all, and your neighbor as yourself.", verse: "Love is patient, love is kind. It is not jealous, [love] is not pompous, it is not inflated.", ref: "1 Corinthians 13:4", saint: "St. Teresa of Calcutta", quote: "\"Do small things with great love.\"" },
  { name: "Humility", body: "Leave the ego at the door — lighter weight, perfect form, full range.", soul: "Know the truth about yourself: all you have is gift.", verse: "Humble yourselves before the Lord and he will exalt you.", ref: "James 4:10", saint: "St. Thérèse of Lisieux", quote: "The Little Way: great love in small, hidden things." },
  { name: "Perseverance", body: "Log every meal this week, even the bad ones. Consistency beats intensity.", soul: "Keep praying when it feels dry. Keep coming back after you fall.", verse: "Let us not grow tired of doing good, for in due time we shall reap our harvest, if we do not give up.", ref: "Galatians 6:9", saint: "St. Monica", quote: "Prayed 17 years for her son — he became St. Augustine." },
  { name: "Diligence", body: "No skipped sessions. Show up, warm up, do the work.", soul: "Fight sloth — especially spiritual sloth. Pray first, scroll later.", verse: "Do you not know that the runners in the stadium all run in the race, but only one wins the prize? Run so as to win.", ref: "1 Corinthians 9:24", saint: "St. Paul the Apostle", quote: "\"I have competed well; I have finished the race; I have kept the faith.\" (2 Tim 4:7)" },
  { name: "Self-Mastery", body: "Choose one comfort to give up this week (sweets, soda, late-night snacks).", soul: "Chastity of eyes and heart; the body serves the soul, not the reverse.", verse: "No, I drive my body and train it, for fear that, after having preached to others, I myself should be disqualified.", ref: "1 Corinthians 9:27", saint: "St. Carlo Acutis", quote: "\"The Eucharist is my highway to heaven.\"" },
  { name: "Gratitude", body: "Thank God for a body that can lift, walk, and heal.", soul: "Gratitude is the memory of the heart. Count gifts in your Examen.", verse: "In all circumstances give thanks, for this is the will of God for you in Christ Jesus.", ref: "1 Thessalonians 5:18", saint: "St. Irenaeus", quote: "\"The glory of God is man fully alive.\"" },
];

export function virtueOfWeek(key) {
  const d = parseKey(key);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.floor(((d - jan1) / DAY + jan1.getDay()) / 7);
  return VIRTUES[(week + d.getFullYear()) % VIRTUES.length];
}

// --- Daily readings: USCCB (NABRE, the translation read at Mass in the U.S.) ---------------

export function usccbUrl(key) {
  const [y, m, d] = key.split("-");
  return `https://bible.usccb.org/bible/readings/${m}${d}${y.slice(2)}.cfm`;
}
