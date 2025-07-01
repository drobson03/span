import { Label } from "~/components/ui/label";
import { useFieldContext } from "~/hooks/form-context";
import { Textarea } from "../ui/textarea";
import { FieldInfo } from "./field-info";

export default function InputField({
  label,
  ...props
}: Omit<
  React.ComponentProps<typeof Textarea>,
  "id" | "name" | "value" | "onBlur" | "onChange"
> & {
  label: string;
}) {
  const field = useFieldContext<string | number>();
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={field.name}>{label}</Label>
      <Textarea
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        {...props}
      />
      <FieldInfo />
    </div>
  );
}
