import { Title } from "@solidjs/meta";

export default function Dashboard() {
  return (
    <>
      <Title>Dashboard</Title>
      <div class="md:flex-[80_1_0]">
        <header class="border-b p-4 md:px-6">
          <h1 class="text-4xl font-semibold">Dashboard</h1>
        </header>
        <div class="p-4 md:px-6"></div>
      </div>
    </>
  );
}
