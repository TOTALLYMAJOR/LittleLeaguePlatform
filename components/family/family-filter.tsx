"use client";

import { UsersRound } from "lucide-react";
import type { FamilyMissionChild } from "@/lib/family-mission-control";

export function FamilyFilter({
  childrenList,
  selectedChildId,
  onSelect
}: {
  childrenList: FamilyMissionChild[];
  selectedChildId: string;
  onSelect: (childId: string) => void;
}) {
  if (!childrenList.length) return null;
  return (
    <div className="family-filter" aria-label="Family filter">
      <button
        type="button"
        className={!selectedChildId ? "is-selected" : ""}
        aria-pressed={!selectedChildId}
        onClick={() => onSelect("")}
      >
        <UsersRound aria-hidden="true" size={16} strokeWidth={2.2} />
        <span>Everyone</span>
      </button>
      {childrenList.map((child) => (
        <button
          type="button"
          key={child.id}
          className={selectedChildId === child.id ? "is-selected" : ""}
          aria-pressed={selectedChildId === child.id}
          onClick={() => onSelect(child.id)}
        >
          <span>{child.label}</span>
          <small>{child.teamName}</small>
        </button>
      ))}
    </div>
  );
}
