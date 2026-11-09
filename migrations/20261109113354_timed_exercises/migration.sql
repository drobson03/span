ALTER TABLE "exercise" ADD COLUMN "target_seconds" integer;--> statement-breakpoint
ALTER TABLE "exercise_type" ADD COLUMN "measurement" text DEFAULT 'reps' NOT NULL;--> statement-breakpoint
ALTER TABLE "exercise" ALTER COLUMN "target_reps" DROP NOT NULL;