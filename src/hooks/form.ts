import { createFormHook } from "@tanstack/react-form";
import { lazy } from "react";
import { fieldContext, formContext } from "~/hooks/form-context";

const ComboboxField = lazy(() => import("~/components/form/combobox"));
const DatePickerField = lazy(() => import("~/components/form/date-picker"));
const InputField = lazy(() => import("~/components/form/input"));
const TextareaField = lazy(() => import("~/components/form/textarea"));

export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    ComboboxField,
    DatePickerField,
    InputField,
    TextareaField,
  },
  formComponents: {},
});
