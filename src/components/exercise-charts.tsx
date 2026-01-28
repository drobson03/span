import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { getExerciseProgressionQueryOptions } from "~/lib/server/functions";
import { cn } from "~/lib/utils";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "./ui/chart";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "./ui/kibo-ui/combobox";

type MetricType = "maxWeight" | "totalVolume" | "totalReps";

const metricLabels: Record<MetricType, string> = {
  maxWeight: "Max Weight",
  totalVolume: "Total Volume",
  totalReps: "Total Reps",
};

export default function ExerciseCharts() {
  const [metric, setMetric] = useState<MetricType>("maxWeight");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );

  const { data: progressions } = useQuery(
    getExerciseProgressionQueryOptions(),
  );

  const selectedProgression =
    progressions?.find((p) => p.exerciseTypeId === selectedExerciseId) ??
    progressions?.[0];

  if (!progressions || progressions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Exercise Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No exercise data available. Start logging workouts to see your
            progress.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-semibold text-lg">Exercise Progress</h2>
        <div className="flex gap-1">
          {(["maxWeight", "totalVolume", "totalReps"] as const).map((m) => (
            <Button
              key={m}
              size="sm"
              variant={metric === m ? "default" : "outline"}
              onClick={() => setMetric(m)}
              className={cn(metric !== m && "text-muted-foreground")}
            >
              {metricLabels[m]}
            </Button>
          ))}
        </div>
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base">
            {selectedProgression?.exerciseTypeName}
          </CardTitle>
          <Combobox
            data={progressions.map((p) => ({
              label: p.exerciseTypeName,
              value: p.exerciseTypeId,
            }))}
            type="exercise"
            value={selectedProgression?.exerciseTypeId}
            onValueChange={setSelectedExerciseId}
          >
            <ComboboxTrigger className="w-[200px]" />
            <ComboboxContent>
              <ComboboxInput />
              <ComboboxList>
                <ComboboxEmpty />
                <ComboboxGroup>
                  {progressions.map((p) => (
                    <ComboboxItem key={p.exerciseTypeId} value={p.exerciseTypeId}>
                      {p.exerciseTypeName}
                    </ComboboxItem>
                  ))}
                </ComboboxGroup>
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </CardHeader>
        <CardContent>
          {selectedProgression && selectedProgression.data.length >= 2 ? (
            <ChartContainer
              config={{
                [metric]: {
                  label: metricLabels[metric],
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[250px] w-full"
            >
              <LineChart
                data={selectedProgression.data}
                margin={{ left: 12, right: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => format(new Date(value), "MMM d")}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={50}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) =>
                        format(new Date(value), "MMM d, yyyy")
                      }
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey={metric}
                  stroke="var(--color-maxWeight)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground text-sm">
              Not enough data points to show chart (need at least 2)
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
