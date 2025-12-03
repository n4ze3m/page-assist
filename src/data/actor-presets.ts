import type { ActorSettings } from "@/types/actor"
import { createDefaultActorSettings } from "@/types/actor"

export type ActorPresetId =
  | "slice_of_life"
  | "dungeon_crawl"
  | "romance"
  | "work_session"

export type ActorPreset = {
  id: ActorPresetId
  /**
   * Apply this preset on top of a base settings object.
   * Returns a new ActorSettings instance.
   */
  apply: (base: ActorSettings) => ActorSettings
}

export const ACTOR_PRESETS: ActorPreset[] = [
  {
    id: "slice_of_life",
    apply: (base: ActorSettings): ActorSettings => {
      const next = base
      const aspects = (next.aspects || []).map((aspect) => {
        if (aspect.id === "user_state") {
          return {
            ...aspect,
            value: aspect.value || "relaxed, casual"
          }
        }
        if (aspect.id === "user_focus") {
          return {
            ...aspect,
            value:
              aspect.value ||
              "day-to-day routines, small tasks, and low-stakes choices"
          }
        }
        if (aspect.id === "char_state") {
          return {
            ...aspect,
            value: aspect.value || "warm, approachable"
          }
        }
        if (aspect.id === "char_goal") {
          return {
            ...aspect,
            value:
              aspect.value ||
              "maintain relationships, share everyday moments, and offer support"
          }
        }
        if (aspect.id === "world_location") {
          return {
            ...aspect,
            value: aspect.value || "small apartment, cozy café, or quiet neighborhood street"
          }
        }
        if (aspect.id === "world_time_of_day") {
          return {
            ...aspect,
            value: aspect.value || "late afternoon or evening"
          }
        }
        if (aspect.id === "world_weather") {
          return {
            ...aspect,
            value: aspect.value || "mild, calm weather"
          }
        }
        return aspect
      })

      const notes =
        next.notes && next.notes.trim().length > 0
          ? next.notes
          : "Keep the tone grounded and low-stakes. Focus on everyday routines, small conflicts, and character chemistry in a contemporary setting."

      return {
        ...next,
        aspects,
        notes
      }
    }
  },
  {
    id: "dungeon_crawl",
    apply: (base: ActorSettings): ActorSettings => {
      const next = base
      const aspects = (next.aspects || []).map((aspect) => {
        if (aspect.id === "user_role") {
          return {
            ...aspect,
            value:
              aspect.value ||
              "adventurer or party leader responsible for decisions and tactics"
          }
        }
        if (aspect.id === "char_role") {
          return {
            ...aspect,
            value:
              aspect.value ||
              "adventurer, party member, or companion with unique skills"
          }
        }
        if (aspect.id === "user_state") {
          return {
            ...aspect,
            value: aspect.value || "alert, tactical, mildly anxious"
          }
        }
        if (aspect.id === "char_state") {
          return {
            ...aspect,
            value: aspect.value || "focused, battle-ready, occasionally sardonic"
          }
        }
        if (aspect.id === "char_goal") {
          return {
            ...aspect,
            value:
              aspect.value ||
              "survive, explore deeper, and secure treasure or key objectives"
          }
        }
        if (aspect.id === "world_location") {
          return {
            ...aspect,
            value:
              aspect.value ||
              "ancient dungeon: narrow corridors, traps, hidden rooms, and magical wards"
          }
        }
        if (aspect.id === "world_lighting") {
          return {
            ...aspect,
            value: aspect.value || "dim torchlight and flickering magical glyphs"
          }
        }
        if (aspect.id === "world_weather") {
          return {
            ...aspect,
            value: aspect.value || "stale underground air, damp stone, distant echoes"
          }
        }
        if (aspect.id === "world_time_of_day") {
          return {
            ...aspect,
            value: aspect.value || "timeless underground environment"
          }
        }
        return aspect
      })

      const notes =
        next.notes && next.notes.trim().length > 0
          ? next.notes
          : "Emphasize exploration, traps, puzzles, and combat. Maintain tension with occasional quiet moments for planning, banter, and character decisions about risk and reward."

      return {
        ...next,
        aspects,
        notes
      }
    }
  },
  {
    id: "romance",
    apply: (base: ActorSettings): ActorSettings => {
      const next = base
      const aspects = (next.aspects || []).map((aspect) => {
        if (aspect.id === "user_state") {
          return {
            ...aspect,
            value: aspect.value || "curious, a little vulnerable, open to connection"
          }
        }
        if (aspect.id === "user_focus") {
          return {
            ...aspect,
            value:
              aspect.value ||
              "explore emotional intimacy, understand the other person, and build trust"
          }
        }
        if (aspect.id === "char_state") {
          return {
            ...aspect,
            value: aspect.value || "affectionate, attentive, emotionally present"
          }
        }
        if (aspect.id === "char_goal") {
          return {
            ...aspect,
            value:
              aspect.value ||
              "deepen the connection and create a sense of mutual safety and care"
          }
        }
        if (aspect.id === "world_location") {
          return {
            ...aspect,
            value:
              aspect.value ||
              "intimate setting such as a quiet café, park at dusk, or softly lit living room"
          }
        }
        if (aspect.id === "world_lighting") {
          return {
            ...aspect,
            value: aspect.value || "warm, soft lighting"
          }
        }
        if (aspect.id === "world_weather") {
          return {
            ...aspect,
            value: aspect.value || "gentle, calm weather that supports cozy vibes"
          }
        }
        return aspect
      })

      const notes =
        next.notes && next.notes.trim().length > 0
          ? next.notes
          : "Focus on emotional beats, subtle gestures, and mutual consent. Avoid rushing; let feelings build through dialogue, shared memories, and small acts of care."

      return {
        ...next,
        aspects,
        notes
      }
    }
  },
  {
    id: "work_session",
    apply: (base: ActorSettings): ActorSettings => {
      const next = base
      const aspects = (next.aspects || []).map((aspect) => {
        if (aspect.id === "user_role") {
          return {
            ...aspect,
            value:
              aspect.value ||
              "knowledge worker, student, or independent creator focusing on a concrete task"
          }
        }
        if (aspect.id === "user_state") {
          return {
            ...aspect,
            value: aspect.value || "focused, mildly time-pressured, wants clarity"
          }
        }
        if (aspect.id === "user_focus") {
          return {
            ...aspect,
            value:
              aspect.value ||
              "making progress on the current project, document, or study topic"
          }
        }
        if (aspect.id === "char_role") {
          return {
            ...aspect,
            value:
              aspect.value ||
              "assistant or collaborator helping with planning, writing, or problem-solving"
          }
        }
        if (aspect.id === "char_state") {
          return {
            ...aspect,
            value:
              aspect.value ||
              "calm, organized, and task-oriented, with a focus on useful next steps"
          }
        }
        if (aspect.id === "char_goal") {
          return {
            ...aspect,
            value:
              aspect.value ||
              "help the user break down work, clarify questions, and move tasks forward"
          }
        }
        if (aspect.id === "world_location") {
          return {
            ...aspect,
            value:
              aspect.value ||
              "desk, office, or home workspace with access to necessary tools and documents"
          }
        }
        if (aspect.id === "world_time_of_day") {
          return {
            ...aspect,
            value: aspect.value || "normal working hours or a focused study session"
          }
        }
        if (aspect.id === "world_weather") {
          return {
            ...aspect,
            value:
              aspect.value ||
              "background conditions are irrelevant; attention is on the work at hand"
          }
        }
        if (aspect.id === "world_lighting") {
          return {
            ...aspect,
            value: aspect.value || "clear, functional lighting suitable for reading or screens"
          }
        }
        if (aspect.id === "world_tone") {
          return {
            ...aspect,
            value:
              aspect.value ||
              "focused, practical, and supportive; prioritize clarity, structure, and actionable outcomes"
          }
        }
        return aspect
      })

      const notes =
        next.notes && next.notes.trim().length > 0
          ? next.notes
          : "Keep the conversation anchored to concrete tasks, questions, or documents. Favor structured suggestions, checklists, and clear next steps over long digressions."

      return {
        ...next,
        aspects,
        notes
      }
    }
  }
]

export const applyActorPresetById = (
  base: ActorSettings,
  presetId: ActorPresetId
): ActorSettings => {
  const preset = ACTOR_PRESETS.find((p) => p.id === presetId)
  if (!preset) {
    return base
  }
  return preset.apply(base)
}
