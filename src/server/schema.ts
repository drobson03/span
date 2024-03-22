import { relations } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";

export const workout = sqliteTable(
  "workout",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    notes: text("notes"),
    date: integer("date", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (workout) => ({
    userIdIdx: index("workout_user_id_idx").on(workout.userId),
  }),
);

export type Workout = typeof workout.$inferSelect;

export type InsertWorkout = typeof workout.$inferInsert;

export const workoutRelations = relations(workout, ({ one, many }) => ({
  user: one(user, {
    fields: [workout.userId],
    references: [user.id],
  }),
  exercises: many(exercise),
}));

export const exerciseType = sqliteTable("exercise_type", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text("name").notNull(),
});

export type ExerciseType = typeof exerciseType.$inferSelect;

export type InsertExerciseType = typeof exerciseType.$inferInsert;

export const exerciseTypeRelations = relations(exerciseType, ({ many }) => ({
  exercises: many(exercise),
}));

export const exercise = sqliteTable(
  "exercise",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    targetReps: integer("target_reps").notNull(),
    weight: real("weight").notNull(),
    notes: text("notes"),
    workoutId: text("workout_id")
      .notNull()
      .references(() => workout.id),
    exerciseTypeId: text("exercise_type_id")
      .notNull()
      .references(() => exerciseType.id),
  },
  (exercise) => ({
    workoutIdIdx: index("exercise_workout_id_idx").on(exercise.workoutId),
    exerciseTypeIdIdx: index("exercise_exercise_type_id_idx").on(
      exercise.exerciseTypeId,
    ),
  }),
);

export type Exercise = typeof exercise.$inferSelect;

export type InsertExercise = typeof exercise.$inferInsert;

export const exerciseRelations = relations(exercise, ({ one, many }) => ({
  workout: one(workout, {
    fields: [exercise.workoutId],
    references: [workout.id],
  }),
  exerciseType: one(exerciseType, {
    fields: [exercise.exerciseTypeId],
    references: [exerciseType.id],
  }),
  sets: many(set),
}));

export const set = sqliteTable(
  "set",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    reps: integer("reps").notNull(),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercise.id),
  },
  (set) => ({
    exerciseIdIdx: index("set_exercise_id_idx").on(set.exerciseId),
  }),
);

export type Set = typeof set.$inferSelect;

export type InsertSet = typeof set.$inferInsert;

export const setRelations = relations(set, ({ one }) => ({
  exercise: one(exercise, {
    fields: [set.exerciseId],
    references: [exercise.id],
  }),
}));

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export type User = typeof user.$inferSelect;

export type InsertUser = typeof user.$inferInsert;

export const userRelations = relations(user, ({ many }) => ({
  workouts: many(workout),
  sessions: many(session),
}));

export const session = sqliteTable(
  "session",
  {
    id: text("id").notNull().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    expiresAt: integer("expires_at").notNull(),
  },
  (session) => ({
    userIdIdx: index("session_user_id_idx").on(session.userId),
  }),
);

export type Session = typeof session.$inferSelect;

export type InsertSession = typeof session.$inferInsert;

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));
