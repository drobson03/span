import { relations } from "drizzle-orm";
import {
  index,
  integer,
  real,
  pgTable,
  timestamp,
  jsonb,
  varchar,
  text,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

export const user = pgTable("user", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: varchar("name").notNull(),
  email: varchar("email").notNull(),
  googleId: varchar("google_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type User = typeof user.$inferSelect;

export type InsertUser = typeof user.$inferInsert;

export const workout = pgTable(
  "workout",
  {
    id: varchar("id", { length: 21 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: varchar("user_id", { length: 21 })
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    notes: text("notes"),
    date: timestamp("date").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("workout_user_id_idx").on(table.userId)],
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

export const exerciseType = pgTable("exercise_type", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: varchar("name").notNull(),
});

export type ExerciseType = typeof exerciseType.$inferSelect;

export type InsertExerciseType = typeof exerciseType.$inferInsert;

export const exerciseTypeRelations = relations(exerciseType, ({ many }) => ({
  exercises: many(exercise),
}));

export type WorkoutSet = {
  reps: number;
};

export const exercise = pgTable(
  "exercise",
  {
    id: varchar("id", { length: 21 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    targetReps: integer("target_reps").notNull(),
    weight: real("weight").notNull(),
    notes: text("notes"),
    sets: jsonb("sets").$type<WorkoutSet[]>().notNull(),
    workoutId: varchar("workout_id", { length: 21 })
      .notNull()
      .references(() => workout.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    exerciseTypeId: varchar("exercise_type_id", { length: 21 })
      .notNull()
      .references(() => exerciseType.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
  },
  (table) => [
    index("exercise_workout_id_idx").on(table.workoutId),
    index("exercise_exercise_type_id_idx").on(table.exerciseTypeId),
  ],
);

export type Exercise = typeof exercise.$inferSelect;

export type InsertExercise = typeof exercise.$inferInsert;

export const exerciseRelations = relations(exercise, ({ one }) => ({
  workout: one(workout, {
    fields: [exercise.workoutId],
    references: [workout.id],
  }),
  exerciseType: one(exerciseType, {
    fields: [exercise.exerciseTypeId],
    references: [exerciseType.id],
  }),
}));

export const userRelations = relations(user, ({ many }) => ({
  workouts: many(workout),
  sessions: many(session),
}));

export const session = pgTable(
  "session",
  {
    id: varchar("id").primaryKey(),
    userId: varchar("user_id", { length: 21 })
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export type Session = typeof session.$inferSelect;

export type InsertSession = typeof session.$inferInsert;

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export type ExerciseWithRelations = Exercise & {
  exerciseType: ExerciseType;
};

export type WorkoutWithRelations = Workout & {
  exercises: ExerciseWithRelations[];
};
