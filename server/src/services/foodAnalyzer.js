// AI food analyzer.
// Given a free-text description, suggests category, veg/non-veg, a safe shelf life and handling tips.
// Uses Google Gemini when GEMINI_API_KEY is set; otherwise falls back to a built-in keyword model,
// so the app always works offline / without an API key.

const NONVEG = ['chicken', 'mutton', 'fish', 'egg', 'eggs', 'meat', 'prawn', 'biryani chicken', 'keema', 'beef', 'pork', 'omelette'];
const CATEGORY_KEYWORDS = {
  bakery: ['bread', 'cake', 'bun', 'pastry', 'cookie', 'cookies', 'muffin', 'croissant', 'pav', 'biscuit'],
  packaged: ['packet', 'packaged', 'sealed', 'bottle', 'chips', 'juice', 'tetra', 'canned', 'noodles packet'],
  fruits_veg: ['fruit', 'fruits', 'banana', 'apple', 'vegetable', 'vegetables', 'tomato', 'onion', 'potato', 'mango'],
  raw: ['rice bag', 'flour', 'atta', 'dal', 'lentil', 'grain', 'raw', 'uncooked', 'pulses'],
  cooked: ['rice', 'dal', 'curry', 'roti', 'chapati', 'sabzi', 'biryani', 'paneer', 'pulao', 'khichdi', 'meal', 'thali', 'pasta', 'cooked'],
};
// Conservative safe shelf life at room temperature, in hours.
const SHELF_LIFE = { cooked: 4, bakery: 24, fruits_veg: 48, raw: 168, packaged: 168, other: 6 };
const TIPS = {
  cooked: ['Keep covered and away from direct sunlight', 'Distribute within 4 hours of cooking', 'Use clean, food-grade containers'],
  bakery: ['Store in a dry place', 'Check for mould before distributing'],
  fruits_veg: ['Remove any spoiled pieces', 'Keep in a ventilated crate'],
  raw: ['Keep sealed and dry', 'Check packaging date'],
  packaged: ['Check expiry date printed on the pack', 'Do not distribute damaged packets'],
  other: ['Inspect before distributing'],
};

function ruleBasedAnalyze(text) {
  const t = String(text).toLowerCase();
  const has = (w) => new RegExp(`\\b${w}(s|es)?\\b`).test(t);
  const isNonVeg = NONVEG.some(has);
  const isVeg = /\b(veg|vegetarian|paneer|dal|sabzi)\b/.test(t);
  let category = 'other';
  let best = 0;
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    const hits = words.filter(has).length;
    if (hits > best) { best = hits; category = cat; }
  }
  const food_type = isNonVeg && isVeg ? 'mixed' : isNonVeg ? 'nonveg' : 'veg';
  return {
    category,
    food_type,
    shelf_life_hours: SHELF_LIFE[category],
    tips: TIPS[category],
    source: 'rule-based',
  };
}

async function geminiAnalyze(text) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const prompt = `You are a food-safety assistant for a surplus food donation app in India.
Analyse this donated food description and reply with ONLY a JSON object, no markdown:
{"category": one of "cooked","raw","packaged","bakery","fruits_veg","other",
 "food_type": one of "veg","nonveg","mixed",
 "shelf_life_hours": integer, a conservative safe time at room temperature,
 "tips": array of 2-3 short handling tips}
Description: """${String(text).slice(0, 500)}"""`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const json = JSON.parse(raw.replace(/```json|```/g, '').trim());
  const valid = ['cooked', 'raw', 'packaged', 'bakery', 'fruits_veg', 'other'];
  return {
    category: valid.includes(json.category) ? json.category : 'other',
    food_type: ['veg', 'nonveg', 'mixed'].includes(json.food_type) ? json.food_type : 'veg',
    shelf_life_hours: Math.max(1, Math.min(168, parseInt(json.shelf_life_hours, 10) || 4)),
    tips: Array.isArray(json.tips) ? json.tips.slice(0, 3).map(String) : [],
    source: 'gemini',
  };
}

async function analyzeFood(text) {
  if (process.env.GEMINI_API_KEY) {
    try {
      return await geminiAnalyze(text);
    } catch (err) {
      console.warn('Gemini analysis failed, using rule-based fallback:', err.message);
    }
  }
  return ruleBasedAnalyze(text);
}

module.exports = { analyzeFood, ruleBasedAnalyze };
