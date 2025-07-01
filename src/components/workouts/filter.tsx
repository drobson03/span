import { useState, useMemo, useCallback } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { XIcon } from "lucide-react";

export interface WorkoutFilterProps {
  availableTags: string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export default function WorkoutFilter({
  availableTags,
  selectedTags,
  onTagsChange,
}: WorkoutFilterProps) {
  const [showAllTags, setShowAllTags] = useState(false);

  // Memoize display tags to prevent recalculation
  const displayTags = useMemo(() => {
    return showAllTags ? availableTags : availableTags.slice(0, 6);
  }, [availableTags, showAllTags]);

  // Convert selectedTags to Set for O(1) lookup performance
  const selectedTagsSet = useMemo(() => {
    return new Set(selectedTags);
  }, [selectedTags]);

  // Memoize toggle handler to prevent unnecessary re-renders
  const toggleTag = useCallback(
    (tag: string) => {
      if (selectedTagsSet.has(tag)) {
        onTagsChange(selectedTags.filter((t) => t !== tag));
      } else {
        onTagsChange([...selectedTags, tag]);
      }
    },
    [selectedTags, selectedTagsSet, onTagsChange],
  );

  // Memoize clear handler
  const clearAllTags = useCallback(() => {
    onTagsChange([]);
  }, [onTagsChange]);

  // Memoize show more/less toggle
  const toggleShowAllTags = useCallback(() => {
    setShowAllTags((prev) => !prev);
  }, []);

  if (availableTags.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Filter by tags</h3>
        {selectedTags.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllTags}
            className="h-auto p-1 text-xs"
          >
            Clear all
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {displayTags.map((tag) => {
          const isSelected = selectedTagsSet.has(tag);
          return (
            <Badge
              key={tag}
              variant={isSelected ? "default" : "outline"}
              className="hover:bg-accent cursor-pointer text-xs capitalize"
              onClick={() => toggleTag(tag)}
            >
              {tag}
              {isSelected && <XIcon className="ml-1 size-3" />}
            </Badge>
          );
        })}

        {availableTags.length > 6 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleShowAllTags}
            className="h-auto p-1 text-xs"
          >
            {showAllTags ? "Show less" : `+${availableTags.length - 6} more`}
          </Button>
        )}
      </div>

      {selectedTags.length > 0 && (
        <div className="text-muted-foreground text-xs">
          Showing workouts with:{" "}
          <span className="capitalize">{selectedTags.join(", ")}</span>
        </div>
      )}
    </div>
  );
}
