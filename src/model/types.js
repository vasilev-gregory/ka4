// Shape of the saved data (key "gymapp-state-v1"). Documentation only: editors pick these up through
// JSDoc (`@type {import("./types.js").AppData}`). Numbers typed by the user are kept as strings, exactly
// as entered ("80", "72,5"); read them with num(). Times are epoch milliseconds.

/**
 * @typedef {object} AppData
 * @property {number} version            schema version (SCHEMA_VERSION); migrate() upgrades older data
 * @property {number} [savedAt]          when this copy was written; the newer copy wins on load / sync
 * @property {Exercise[]} exercises      strength exercises: built-in (id = slug of the name) and user-made
 * @property {Program[]} programs
 * @property {Split[]} splits            programs grouped into a week
 * @property {string|null} activeSplitId the split the workout tab follows (next program of the week)
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
 * @property {boolean} [soundSilent]      iOS: timer sounds through the silent switch (audio session "playback"); on unless false
 * @property {"strength"|"stretch"} [mode]
 * @property {"amber"|"amberGlow"|"red"|"roseGlow"|"pink"|"violet"|"teal"|"aurora"} [strengthColor]  strength mode's accent (ui/palettes.js; default amber)
 * @property {"amber"|"amberGlow"|"red"|"roseGlow"|"pink"|"violet"|"teal"|"aurora"} [stretchColor]   stretching mode's accent (default teal)
 * @property {boolean} [namesRu]          Russian exercise names first (default); false = English first
 * @property {boolean} [gestureHintSeen]  the gestures hint on the first workout was dismissed
 * @property {boolean} [tourDone]         the first-launch tour was finished or skipped (absent on a fresh install)
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
 * @property {Record<string, number>} [muscles]  muscles it works, muscle id -> 1 (main) | 0.5 (helping); none = muscles.js rules
 * @property {string[]} [equip]          what it is done with (model/equipment.js keys); none = read from the names
 * @property {string} [aka]               other names it goes by, for the search (built-in ones: catalog EX_AKA)
 */

/** @typedef {{ id: string, name: string, items: ProgramItem[] }} Program  name may be "" (shown as "Без названия") */
/** @typedef {{ id: string, name: string, items: { programId: string }[] }} Split  a program may be in it more than once */
/** @typedef {{ exerciseId: string, sets: number, min?: number, km?: number }} ProgramItem  sets: how many sets to prefill; cardio plan: min or km */

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
 * @property {"hevy"|"gymkeeper"|"diary"} [source]  imported from another app («diary»: «Дневник тренировок»)
 * @property {boolean} [off]              «не в зачёт» (a bad day): counted as a workout, not in progress (workout.js counts)
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
 * @property {string} [g]                group id: consecutive sets with the same g are one drop set (each step to failure)
 * @property {number} [at]               when it was confirmed (rest statistics)
 * @property {number|null} [rest]       rest before it, fixed at the tick (ms; null: none — first, or across a pause)
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
 * @property {StretchRun} [active]       the run going on (or just finished, until closed)
 */

/**
 * @typedef {object} StretchRun  a run of a program; its timeline is the program now plus extraRounds
 * @property {string} programId
 * @property {number} startedAt
 * @property {number} extraRounds        rounds added in this run
 * @property {Record<string, number>} held  seconds held so far per stretch, one side
 * @property {{ k: string, exId: string|null, side: string|null, nth: number }} at  the phase it is in
 * @property {number} dur                that phase's length, s (an edit of it moves `end`)
 * @property {number} end                when that phase ends, ms
 * @property {number|null} pausedLeft    paused: ms left of the phase
 * @property {boolean} [done]            ran to the end (already in sessions); finishedAt then
 * @property {number} [finishedAt]
 * @property {StretchProgram} [program]  a run without a program (programId "quick"): the stretches chosen for it
 * @property {string} [savedAs]           that run kept as a program: its id
 * @property {boolean} [folded]           the player folded into the strip above the tab bar
 * @property {number} [entered]           phases entered so far (a new phase's signal, even the same phase again)
 */

/** @typedef {{ id: string, name: string, ru?: string, aka?: string, sides: boolean, area?: string, photo?: string }} StretchExercise  sides: done on both sides; aka: other names, for the search */

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
