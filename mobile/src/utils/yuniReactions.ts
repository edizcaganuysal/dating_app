/**
 * Yuni AI contextual reactions for the conversational onboarding.
 * Maps user choices to fun, personalized Yuni messages.
 */

export const programReactions: Record<string, string> = {
  'Computer Science': "A CS person! We love a good debugger 🐛",
  'Engineering': "Building the future, one equation at a time 🔧",
  'Business': "Future CEO energy! 📈",
  'Economics': "Supply and demand of love? I like where this is going 📊",
  'Psychology': "Ooh, you already know what makes people tick 🧠",
  'Biology': "A lover of life — literally 🧬",
  'Pre-Med': "Future doctor! Your future dates are lucky 🩺",
  'Math': "Numbers person! I promise dating isn't just statistics 📐",
  'Physics': "There's definitely some chemistry in your future ⚛️",
  'Chemistry': "Let's find you some real chemistry 🧪",
  'English': "A person of words! Love that 📚",
  'History': "Those who know history... make great storytellers 📜",
  'Political Science': "A world-changer! Let's find someone who keeps up 🌍",
  'Sociology': "You get people. That's a superpower 🤝",
  'Art': "A creative soul — love that 🎨",
  'Music': "If you can play an instrument, you're already winning 🎵",
  'Philosophy': "Deep thinker! Your conversations must be incredible 🤔",
  'Nursing': "Caring by nature — that's beautiful 💉",
  'Law': "I'll make sure your match can hold a good argument 😏",
  'Architecture': "Designing your love life — I see what you did there 🏗️",
  'Environmental Science': "Planet lover! 🌱",
  'Communications': "You know how to talk — that's literally half of dating 📣",
  'Kinesiology': "Active and driven — love it 🏃",
  'Education': "Patient, kind, and smart. The trifecta ✏️",
  'Data Science': "You'll appreciate my matching algorithm 📊",
  'Neuroscience': "You literally study how love works in the brain 🧠✨",
  'International Relations': "Worldly! Your dates must have the best stories ✈️",
  'Film Studies': "Movie dates are gonna be next level with you 🎬",
  'Linguistics': "Polyglot vibes — very attractive 🗣️",
  'Anthropology': "You understand humans better than most 🏛️",
  '__default': "Nice! That's a great program ✊",
};

export const yearReactions: Record<string, string> = {
  '1': "Fresh start! Everything's ahead of you ✨",
  '2': "Sophomore energy — you know the ropes now 💪",
  '3': "Junior year! The sweet spot of college life 🎯",
  '4': "Senior year — making every moment count 🔥",
  '5': "The veteran! You know this campus like the back of your hand 🗺️",
  '6': "Six years? You must really love learning (or the campus food) 😄",
  '__default': "Nice! Let's make this year count 🎓",
};

export const intentReactions: Record<string, string> = {
  'serious': "I love that! Finding your person — let's make it happen 💕",
  'casual': "No pressure, just good vibes. I got you ✌️",
  'open': "The best things happen when you least expect them 🌟",
  '__default': "Great choice! I'll match you accordingly",
};

export const activityMilestones: Record<number, string> = {
  3: "Great picks! You've got range 🎯",
  5: "You're down for anything! I love the energy 🔥",
  7: "Wow, you're a true adventurer! 🌟",
};

export const interestMilestones: Record<number, string> = {
  3: "Solid start! Keep going 💪",
  5: "You're eclectic! I love it 🎨",
  8: "Wow, you're into everything! 🌈",
  10: "Maxed out! You're one interesting person 🔥",
};

export const valueReactions = {
  halfway: "Halfway there! I'm learning a lot about you 😏",
  complete: "I think I'm starting to get you... 🔮",
};

export const dealbreakersReactions: Record<string, string> = {
  'none': "No dealbreakers? Open-minded — I like it! 🌊",
  'some': "Noted. I'll keep those in mind when matching you 📝",
};

export const socialEnergyReactions: Record<string, string> = {
  'low': "The quiet ones always surprise people 🌙",
  'mid': "A perfect balance — adapt to any group ⚖️",
  'high': "Life of the party! Your group dates will be legendary 🔥",
};

export const roleReactions: Record<string, string> = {
  'Catalyst': "You get things started — groups need people like you 🚀",
  'Entertainer': "The vibe-setter! People are drawn to your energy 🎭",
  'Listener': "The one everyone opens up to — that's rare and special 👂",
  'Planner': "Everything goes smoother with you around 📋",
  'Flexible': "Go with the flow — you make any group better 🌊",
  '__default': "Great choice! That says a lot about you",
};

export const photoReactions = [
  "Looking great! Keep 'em coming! 📸",
  "Nice! The camera loves you ✨",
  "That's a good one! 🔥",
  "Perfect! More photos = better matches 🎯",
  "Wow, great photo! 👀",
  "Love it! Your profile is shaping up nicely 💫",
];

export const analyzingMessages = [
  ["Analyzing your vibe...", "Almost there...", "Getting to know you..."],
  ["Building your personality map...", "Mapping your social wavelength...", "Done! Here's what I've got..."],
  ["Processing your choices...", "Finding patterns...", "I see who you are..."],
];

export function getReaction(map: Record<string, string>, key: string): string {
  return map[key] || map['__default'] || '';
}

export function getRandomPhotoReaction(): string {
  return photoReactions[Math.floor(Math.random() * photoReactions.length)];
}
