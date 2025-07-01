import { useStore } from "@tanstack/react-form";
import { useFieldContext } from "~/hooks/form-context";

export function FieldInfo() {
  const field = useFieldContext();

  const isTouched = useStore(field.store, (state) => state.meta.isTouched);
  const isValid = useStore(field.store, (state) => state.meta.isValid);
  const errors = useStore(field.store, (state) => state.meta.errors);

  return isTouched && !isValid ? (
    <em className="text-destructive text-sm">
      {errors.map((error) => error.message).join(", ")}
    </em>
  ) : null;
}
