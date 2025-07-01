import { format, setHours, setMinutes } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { useFieldContext } from "~/hooks/form-context";
import { cn } from "~/lib/utils";
import { Calendar } from "../ui/calendar";
import { Input } from "../ui/input";
import { FieldInfo } from "./field-info";

export default function FormDatePicker({
  label,
  required,
  type = "date",
}: {
  label: string;
  required?: boolean;
  type?: "date" | "datetime";
}) {
  const field = useFieldContext<Date | undefined>();

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={field.name}>{label}</Label>
      <div className="flex w-full flex-row gap-2">
        <div className="flex w-full flex-col gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "justify-start text-left font-normal",
                  !field.state.value && "text-muted-foreground",
                )}
                id={field.name}
                name={field.name}
              >
                <CalendarIcon />
                {field.state.value ? (
                  format(field.state.value, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                captionLayout="dropdown"
                selected={field.state.value}
                onSelect={field.handleChange}
                required={required}
              />
            </PopoverContent>
          </Popover>
        </div>
        {type === "datetime" ? (
          <div className="flex w-full flex-col gap-2">
            <Label htmlFor={`${field.name}-time`} hidden>
              Time
            </Label>
            <Input
              type="time"
              id={`${field.name}-time`}
              value={
                field.state.value ? format(field.state.value, "HH:mm") : ""
              }
              onChange={(e) => {
                field.handleChange(
                  field.state.value
                    ? setMinutes(
                        setHours(
                          field.state.value,
                          Number.parseInt(e.target.value.split(":")[0] ?? "0"),
                        ),
                        Number.parseInt(e.target.value.split(":")[1] ?? "0"),
                      )
                    : new Date(),
                );
              }}
              className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            />
          </div>
        ) : null}
      </div>
      <FieldInfo />
    </div>
  );
}
