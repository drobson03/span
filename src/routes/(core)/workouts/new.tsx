import { Title } from "@solidjs/meta";
import WorkoutForm from "~/components/workouts/form";

export default function NewWorkout() {
  return (
    <>
      <Title>New Workout</Title>
      <div class="md:flex-[80_1_0]">
        <header class="hidden border-b p-4 md:flex md:px-6">
          <h1 class="text-4xl font-semibold">New Workout</h1>
        </header>
        <WorkoutForm />
      </div>
    </>
  );
}
