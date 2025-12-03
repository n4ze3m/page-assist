import type { ActorSettings } from "@/types/actor"
import { createDefaultActorSettings } from "@/types/actor"

export type ActorPresetId = "slice_of_life" | "dungeon_crawl" | "romance"

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
      const next = base ?? createDefaultActorSettings()
      const aspects = (next.aspects || []).map((aspect) => {
        if (aspect.id === "user_mood") {
          return {
            ...aspect,
            value: aspect.value || "relaxed, casual"
          }
        }
        if (aspect.id === "char_mood") {
          return {
            ...aspect,
            value: aspect.value || "warm, approachable"
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
      const next = base ?? createDefaultActorSettings()
      const aspects = (next.aspects || []).map((aspect) => {
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
        if (aspect.id === "user_mood") {
          return {
            ...aspect,
            value: aspect.value || "alert, tactical, mildly anxious"
          }
        }
        if (aspect.id === "char_mood") {
          return {
            ...aspect,
            value: aspect.value || "focused, battle-ready, occasionally sardonic"
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
      const next = base ?? createDefaultActorSettings()
      const aspects = (next.aspects || []).map((aspect) => {
        if (aspect.id === "user_mood") {
          return {
            ...aspect,
            value: aspect.value || "curious, a little vulnerable, open to connection"
          }
        }
        if (aspect.id === "char_mood") {
          return {
            ...aspect,
            value: aspect.value || "affectionate, attentive, emotionally present"
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
  }
]

export const applyActorPresetById = (
  base: ActorSettings,
  presetId: ActorPresetId
): ActorSettings => {
  const preset = ACTOR_PRESETS.find((p) => p.id === presetId)
  if (!preset) {
    return base ?? createDefaultActorSettings()
  }
  return preset.apply(base ?? createDefaultActorSettings())
}

