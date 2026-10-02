import { Optic } from "effect";
import type { Model } from "./model";

const modelOptic = Optic.id<Model>();
export const draftOptic = modelOptic.key("draft");
export const exercisesOptic = draftOptic.key("exercises");
export const exerciseAt = (index: number) => exercisesOptic.at(index);
