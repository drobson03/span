import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ExerciseMeasurement } from "~/lib/server/db/schema";
import { cn, formatDuration } from "~/lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Slider } from "../ui/slider";

const steps: Record<
  ExerciseMeasurement,
  { small: number; large: number; sliderMax: number }
> = {
  reps: { small: 1, large: 5, sliderMax: 30 },
  time: { small: 5, large: 15, sliderMax: 180 },
};

const MIN_VALUE = 1;

/**
 * A set chip that opens a small editor for adjusting its reps/seconds via
 * stepper buttons or by typing a value directly.
 */
export function SetEditor({
  index,
  value,
  measurement,
  onChange,
  onRemove,
  className,
}: {
  index: number;
  value: number;
  measurement: ExerciseMeasurement;
  onChange: (value: number) => void;
  onRemove: () => void;
  className?: string;
}) {
  const timed = measurement === "time";
  const { small, large, sliderMax: baseSliderMax } = steps[measurement];
  // Grow the slider's range for values beyond the default max
  const sliderMax = Math.max(
    baseSliderMax,
    Math.ceil(value / baseSliderMax) * baseSliderMax,
  );
  const unit = timed ? "seconds" : "reps";

  const [open, setOpen] = useState(false);
  // Kept as a string so the input can be cleared while typing
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const adjust = (delta: number) =>
    onChange(Math.max(MIN_VALUE, value + delta));

  const format = (n: number) => (timed ? formatDuration(n) : n);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          type="button"
          className={cn(
            timed && "w-full",
            open && "ring-ring/50 ring-[3px]",
            className,
          )}
          aria-label={`Set ${index + 1}: ${value} ${unit}. Click to edit`}
          onKeyDown={(e) => {
            // Quick keyboard adjustments without opening the editor
            if (e.key === "ArrowUp" || e.key === "ArrowRight") {
              e.preventDefault();
              adjust(e.shiftKey ? large : small);
            } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
              e.preventDefault();
              adjust(-(e.shiftKey ? large : small));
            }
          }}
        >
          {format(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64"
        onOpenAutoFocus={(e) => {
          // Jump straight into typing with a mouse/keyboard, but avoid popping
          // the on-screen keyboard over the steppers on touch devices
          e.preventDefault();
          if (window.matchMedia("(pointer: fine)").matches) {
            inputRef.current?.focus();
            inputRef.current?.select();
          }
        }}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">Set {index + 1}</span>
            <span className="text-muted-foreground">
              {timed ? formatDuration(value) : `${value} reps`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-lg"
              type="button"
              aria-label={`Decrease by ${small}`}
              disabled={value <= MIN_VALUE}
              onClick={() => adjust(-small)}
            >
              <MinusIcon />
            </Button>
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                type="number"
                inputMode="numeric"
                min={MIN_VALUE}
                step={1}
                aria-label={unit}
                className={cn(
                  "h-10 text-center text-lg font-semibold tabular-nums md:text-lg",
                  timed && "pr-6",
                )}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  const next = e.target.valueAsNumber;
                  if (Number.isInteger(next) && next >= MIN_VALUE) {
                    onChange(next);
                  }
                }}
                onBlur={() => setDraft(String(value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setOpen(false);
                  }
                }}
              />
              {timed ? (
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                  s
                </span>
              ) : null}
            </div>
            <Button
              variant="outline"
              size="icon-lg"
              type="button"
              aria-label={`Increase by ${small}`}
              onClick={() => adjust(small)}
            >
              <PlusIcon />
            </Button>
          </div>
          <div className="flex flex-col gap-1.5">
            <Slider
              aria-label={unit}
              min={small}
              max={sliderMax}
              step={small}
              value={[value]}
              onValueChange={([next]) => {
                if (next !== undefined) onChange(next);
              }}
              className="py-2 [&_[data-slot=slider-thumb]]:size-5"
            />
            <div className="text-muted-foreground flex justify-between text-xs tabular-nums">
              <span>{format(small)}</span>
              <span>{format(sliderMax)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                setOpen(false);
                onRemove();
              }}
            >
              <Trash2Icon />
              Remove
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
