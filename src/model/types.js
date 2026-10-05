// Shape of the saved data (key "gymapp-state-v1"). Documentation only: editors pick these up through
// JSDoc (`@type {import("./types.js").AppData}`). Numbers typed by the user are kept as strings, exactly
// as entered ("80", "72,5"); read them with num(). Times are epoch milliseconds.

/**
 * @typedef {object} AppData
 * @property {number} version            schema version (SCHEMA_VERSION); migrate() upgrades older data
 * @property {number} [savedAt]          when this copy was written; the newer copy wins on load / sync
 * @property {Exercise[]} exercises      strength exercises: built-in (id = slug of the name) and user-made
 * @property {Program[]} programs
 * @property {Workout[]} workouts        finished workouts, oldest first; only confirmed sets are kept
 * @property {ActiveWorkout|null} active the running (or paused) workout
 * @property {Measurement[]} measurements
 * @property {StretchData} stretch       stretching mode, fully separate from strength
 * @property {Settings} settings
 * @property {{ programId: string, items: ProgramItem[] }} [pendingProgramUpdate]
 *   a workout closed automatically differed from its program; offered on the next visit
 */

/**
 * @typedef {object} Settings
 * @property {number} restSec             rest countdown length
 * @property {boolean} [countdown]        rest countdown on (default) / off
 * @property {boolean} [sound]            timer sounds on (default) / off
 * @property {"strength"|"stretch"} [mode]
 * @property {boolean} [namesRu]          Russian exercise names first (default); false = English first
 * @property {boolean} [gestureHintSeen]  the gestures hint on the first workout was dismissed
 * @property {string} [bodyWeight]        manual body weight, used when there are no measurements
 * @property {{ key: "w"|"r"|"p"|"rir"|"rest", on: boolean }[]} [columns] set columns, in order
 * @property {number} [lastBackupAt]
 */

/**
 * @typedef {object} Exercise
 * @property {string} id
 * @property {string} name                English name
 * @property {string} [ru]                Russian name
 * @property {string} group               main muscle group (GROUPS)
 * @property {"reps"|"time"|"cardio"} kind  "time": r holds seconds; "cardio": r = minutes, w = km (optional)
 * @property {number} [bw]                share of body weight lifted (push-ups ≈ 0.65); w is then extra weight
 * @property {boolean} [assist]           assisted machine: w is the assistance, load = body weight − w
 * @property {string} [photo]             own picture, a JPEG data URL
 */

/** @typedef {{ id: string, name: string, items: ProgramItem[] }} Program  name may be "" (shown as "Без названия") */
/** @typedef {{ exerciseId: string, sets: number }} ProgramItem  sets: how many sets to prefill */

/**
 * @typedef {object} Workout
 * @property {string} id
 * @property {string|null} programId
 * @property {string} name
 * @property {number} startedAt
 * @property {number} [finishedAt]
 * @property {{ start: number, end?: number }[]} segments  continuations of the same day's workout (pause → continue)
 * @property {{ exerciseId: string, sets: WorkoutSet[] }[]} exercises
 * @property {{ doneAt: number|null }} [warmup]  the warm-up block (workouts started before it existed have none)
 * @property {"hevy"|"gymkeeper"} [source]  imported from another app
 */

/**
 * @typedef {Workout & { paused: boolean, restEndsAt: number|null, lastSetAt?: number }} ActiveWorkout
 *   lastSetAt: start of the running rest (the last confirmed set, or the end of the warm-up)
 */

/**
 * @typedef {object} WorkoutSet
 * @property {string} w                  weight (or extra weight / assistance, see Exercise)
 * @property {string} r                  reps (seconds for "time" exercises)
 * @property {string} p                  partial reps, count as 0.3 of a rep
 * @property {""|"w"} [t]                "w" = warm-up: not counted anywhere
 * @property {number|null} [rir]         reps in reserve 0–4 (4 = "4+"); 0 = to failure
 * @property {string} [g]                group id: consecutive sets with the same g are one drop set / ladder
 * @property {number} [at]               when it was confirmed (rest statistics)
 * @property {boolean} done
 * @property {string} [hw]               hints from last time, shown grey (running workout only)
 * @property {string} [hr]
 * @property {string} [hp]
 */

/** @typedef {{ id: string, date: number, values: Record<string, string>, source?: string }} Measurement  values keyed by MEASURES ids */

/**
 * @typedef {object} StretchData
 * @property {StretchExercise[]} exercises
 * @property {StretchProgram[]} programs
 * @property {StretchSession[]} sessions
 * @property {StretchTiming} defaults    copied into new programs
 */

/** @typedef {{ id: string, name: string, ru?: string, sides: boolean, area?: string, photo?: string }} StretchExercise  sides: done on both sides */

/** @typedef {{ prep: number, work: number, sw: number, rest: number, rounds: number, roundRest: number, mode: "circuit"|"sequence" }} StretchTiming  seconds */

/**
 * @typedef {object} StretchProgram
 * @property {string} id
 * @property {string} name
 * @property {Partial<StretchTiming>} [timing]  over the defaults
 * @property {{ exerciseId: string, over?: Partial<StretchTiming> }[]} items  each stretch once; over = its own times
 */

/**
 * @typedef {object} StretchSession
 * @property {string} id
 * @property {string} programId
 * @property {string} name
 * @property {number} startedAt
 * @property {number} finishedAt
 * @property {boolean} complete            ran to the end
 * @property {Record<string, number>} work seconds actually held per stretch, one side
 */

export {};
