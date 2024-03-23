export default function AreaChartIcon({
  class: className,
}: {
  class?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={className}
    >
      <path d="M3 3v18h18" />
      <path d="M7 12v5h12V8l-5 5-4-4Z" />
    </svg>
  );
}
