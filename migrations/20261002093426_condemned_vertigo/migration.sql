CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"role" text,
	"banned" boolean,
	"ban_reason" text,
	"ban_expires" timestamp
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "exercise" (
	"id" varchar(21) PRIMARY KEY,
	"target_reps" integer NOT NULL,
	"weight" real NOT NULL,
	"notes" text,
	"sets" jsonb NOT NULL,
	"workout_id" varchar(21) NOT NULL,
	"exercise_type_id" varchar(21) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_type" (
	"id" varchar(21) PRIMARY KEY,
	"name" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout" (
	"id" varchar(21) PRIMARY KEY,
	"user_id" text NOT NULL,
	"notes" text,
	"date" timestamp NOT NULL,
	"tags" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "exercises_workout_id_idx" ON "exercise" ("workout_id");--> statement-breakpoint
CREATE INDEX "exercises_exercise_type_id_idx" ON "exercise" ("exercise_type_id");--> statement-breakpoint
CREATE INDEX "workouts_user_id_idx" ON "workout" ("user_id");--> statement-breakpoint
CREATE INDEX "workouts_date_idx" ON "workout" ("date");--> statement-breakpoint
CREATE INDEX "workouts_tags_idx" ON "workout" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "workouts_user_tags_idx" ON "workout" ("user_id","tags");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "exercise" ADD CONSTRAINT "exercise_workout_id_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "exercise" ADD CONSTRAINT "exercise_exercise_type_id_exercise_type_id_fkey" FOREIGN KEY ("exercise_type_id") REFERENCES "exercise_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "workout" ADD CONSTRAINT "workout_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;