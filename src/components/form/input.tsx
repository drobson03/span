import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useFieldContext } from "~/hooks/form-context";
import { FieldInfo } from "./field-info";

export default function InputField({
  label,
  ...props
}: Omit<
  React.ComponentProps<typeof Input>,
  "id" | "name" | "value" | "onBlur" | "onChange"
> & {
  label: string;
}) {
  const field = useFieldContext<string | number>();
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={field.name}>{label}</Label>
      <Input
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) =>
          field.handleChange(
            props.type === "number" ? e.target.valueAsNumber : e.target.value,
          )
        }
        {...props}
      />
      <FieldInfo />
    </div>
  );
}
