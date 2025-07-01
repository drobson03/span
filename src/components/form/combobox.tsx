import { rankItem } from "@tanstack/match-sorter-utils";
import { useMemo } from "react";
import { Label } from "~/components/ui/label";
import { useFieldContext } from "~/hooks/form-context";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "../ui/kibo-ui/combobox";
import { FieldInfo } from "./field-info";

export default function InputField({
  label,
  data,
  ...props
}: Omit<
  React.ComponentProps<typeof Combobox>,
  | "id"
  | "name"
  | "value"
  | "onBlur"
  | "onChange"
  | "onValueChange"
  | "onOpenChange"
> & {
  label: string;
}) {
  const field = useFieldContext<string | number>();

  const dataByValue = useMemo(() => {
    return data?.reduce(
      (acc, item) => {
        acc[item.value] = item;
        return acc;
      },
      {} as Record<string, (typeof data)[number]>,
    );
  }, [data]);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={field.name}>{label}</Label>
      <Combobox
        onValueChange={(value) => field.handleChange(value)}
        value={String(field.state.value)}
        data={data}
        {...props}
      >
        <ComboboxTrigger />
        <ComboboxContent
          filter={(id, search) => {
            const value = dataByValue[id];
            if (!value) return 0;

            return rankItem(value, search, {
              accessors: [(item) => item.label.toLowerCase()],
            }).rank;
          }}
        >
          <ComboboxInput />
          <ComboboxEmpty />
          <ComboboxList>
            <ComboboxGroup>
              {data?.map((item) => (
                <ComboboxItem key={item.value} value={item.value}>
                  {item.label}
                </ComboboxItem>
              ))}
            </ComboboxGroup>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <FieldInfo />
    </div>
  );
}
