import type { CategoryKey } from "@/lib/types";

export type AudienceKey = "everyone" | "outdoor" | "school" | "sensitive";

export type Audience = {
  key: AudienceKey;
  label: string;
  hint: string;
};

export const AUDIENCES: Audience[] = [
  { key: "everyone", label: "Everyone", hint: "General public" },
  { key: "outdoor", label: "Outdoor work", hint: "Construction, delivery, farming, traffic" },
  { key: "school", label: "School and sport", hint: "Students, teachers, athletes" },
  {
    key: "sensitive",
    label: "Higher risk",
    hint: "Children, older adults, pregnancy, heart or lung conditions",
  },
];

export type Guidance = {
  category: Exclude<CategoryKey, "unavailable">;
  audience: AudienceKey;
  headline: string;
  actions: string[];
};

type GuidanceCategory = Guidance["category"];

/**
 * General precautions for each official APIMS band. They are written in plain
 * language and are deliberately conservative. They are not medical advice and
 * do not replace DOE, MOH or local authority advisories, which the UI links to.
 */
const GUIDANCE: Record<GuidanceCategory, Record<AudienceKey, Omit<Guidance, "category" | "audience">>> = {
  good: {
    everyone: {
      headline: "Air quality is good. No special precautions are needed.",
      actions: ["Normal outdoor activity is fine.", "Keep an eye on the trend if haze is reported nearby."],
    },
    outdoor: {
      headline: "Normal outdoor work can continue.",
      actions: ["No mask is needed for air quality.", "Stay hydrated as usual."],
    },
    school: {
      headline: "Outdoor lessons and training can go ahead.",
      actions: ["Normal sport and assembly activity is fine."],
    },
    sensitive: {
      headline: "Normal activity is fine for most people at higher risk.",
      actions: [
        "Keep any prescribed medicine with you as usual.",
        "Check again if haze is reported nearby.",
      ],
    },
  },
  moderate: {
    everyone: {
      headline: "Acceptable for most people.",
      actions: [
        "Normal outdoor activity is fine for most people.",
        "If you notice coughing or throat irritation, take a break indoors.",
      ],
    },
    outdoor: {
      headline: "Work can continue, with attention to symptoms.",
      actions: [
        "Take regular breaks away from traffic and smoke.",
        "Stop and rest if you cough, wheeze or feel short of breath.",
      ],
    },
    school: {
      headline: "Outdoor activity can continue.",
      actions: [
        "Watch students with asthma or breathing difficulty.",
        "Allow extra rest during hard exercise.",
      ],
    },
    sensitive: {
      headline: "Take it easier outdoors if you are sensitive to air pollution.",
      actions: [
        "Reduce long or heavy exertion outdoors.",
        "Keep your reliever medicine within reach.",
        "Stop and rest if symptoms start.",
      ],
    },
  },
  unhealthy: {
    everyone: {
      headline: "Cut down on prolonged or heavy exertion outdoors.",
      actions: [
        "Move strenuous exercise indoors.",
        "Keep windows closed if smoke is noticeable, and use air conditioning on recirculate if available.",
        "Wear a well-fitted N95 or KN95 respirator when you must be outside for long. Surgical masks do not filter fine particles well.",
      ],
    },
    outdoor: {
      headline: "Limit time outdoors and protect your breathing.",
      actions: [
        "Wear a well-fitted N95 or KN95 respirator.",
        "Shorten heavy tasks, rotate workers and schedule rest in clean indoor air.",
        "Report chest pain, severe cough or breathing difficulty straight away.",
      ],
    },
    school: {
      headline: "Move strenuous outdoor activity indoors.",
      actions: [
        "Shorten or move PE, sports and outdoor assemblies indoors.",
        "Keep students with asthma or breathing difficulty inside.",
        "Follow Ministry of Education and school guidance.",
      ],
    },
    sensitive: {
      headline: "Stay indoors where you can, and avoid exertion outdoors.",
      actions: [
        "Keep windows closed and avoid busy roads and smoke.",
        "Wear an N95 or KN95 respirator if you must go out.",
        "Follow your doctor's action plan, and see a doctor if symptoms get worse.",
      ],
    },
  },
  "very-unhealthy": {
    everyone: {
      headline: "Avoid outdoor exertion. Stay indoors where you can.",
      actions: [
        "Postpone outdoor exercise and non-essential trips.",
        "Keep doors and windows closed, and use an air purifier if you have one.",
        "Wear an N95 or KN95 respirator when you must go out.",
      ],
    },
    outdoor: {
      headline: "Avoid outdoor work where possible.",
      actions: [
        "Ask your employer about postponing or rescheduling outdoor tasks.",
        "Wear an N95 or KN95 respirator for any unavoidable work outside.",
        "Take frequent breaks indoors and get medical help for chest pain or breathlessness.",
      ],
    },
    school: {
      headline: "Keep students indoors.",
      actions: [
        "Cancel outdoor lessons, sport and assemblies.",
        "Keep classroom windows and doors closed.",
        "Follow Ministry of Education instructions on school closures.",
      ],
    },
    sensitive: {
      headline: "Stay indoors and keep activity light.",
      actions: [
        "Avoid going outside unless it is essential.",
        "Keep medicines close, and follow your doctor's plan.",
        "Get medical help early if you have trouble breathing, chest pain or severe symptoms.",
      ],
    },
  },
  hazardous: {
    everyone: {
      headline: "Emergency-level air. Stay indoors and follow official instructions.",
      actions: [
        "Stay indoors with doors and windows closed.",
        "Avoid all outdoor exertion.",
        "Wear an N95 or KN95 respirator if you must go out, and check official advisories for closures.",
      ],
    },
    outdoor: {
      headline: "Do not work outdoors unless it is essential.",
      actions: [
        "Follow employer, DOSH and authority instructions.",
        "Use an N95 or KN95 respirator for any essential outdoor task.",
        "Get medical help straight away for chest pain or breathing difficulty.",
      ],
    },
    school: {
      headline: "Follow official school closure instructions.",
      actions: [
        "Keep all students and staff indoors.",
        "Check Ministry of Education announcements for closures.",
      ],
    },
    sensitive: {
      headline: "Stay indoors and get medical advice early.",
      actions: [
        "Do not go outside unless it is essential.",
        "Keep medicines close, and call a doctor or emergency services if breathing becomes difficult.",
      ],
    },
  },
};

export function isGuidanceCategory(category: CategoryKey): category is GuidanceCategory {
  return category !== "unavailable";
}

/**
 * Returns general precautions for an official APIMS band and audience, or null
 * when there is no reading to base advice on. Never invents advice for a missing
 * reading.
 */
export function guidanceFor(
  category: CategoryKey,
  audience: AudienceKey = "everyone",
): Guidance | null {
  if (!isGuidanceCategory(category)) return null;
  const entry = GUIDANCE[category][audience];
  return { category, audience, headline: entry.headline, actions: [...entry.actions] };
}
