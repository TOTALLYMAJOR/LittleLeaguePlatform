import type { ProgramThemeKey } from "./types";

export interface ProgramThemePreset {
  key: ProgramThemeKey;
  label: string;
  primaryColor: string;
  secondaryColor: string;
  mascotHint: string;
  fieldLabel: string;
  practiceWord: string;
}

export const programThemePresets: ProgramThemePreset[] = [
  { key: "soccer", label: "Soccer", primaryColor: "#16a34a", secondaryColor: "#facc15", mascotHint: "Strikers", fieldLabel: "Pitch", practiceWord: "Training" },
  { key: "football", label: "Football", primaryColor: "#7c2d12", secondaryColor: "#f97316", mascotHint: "Gridiron", fieldLabel: "Field", practiceWord: "Practice" },
  { key: "baseball", label: "Baseball", primaryColor: "#1d4ed8", secondaryColor: "#f97316", mascotHint: "Sluggers", fieldLabel: "Diamond", practiceWord: "Practice" },
  { key: "scouts", label: "Scouts", primaryColor: "#15803d", secondaryColor: "#ca8a04", mascotHint: "Trail Crew", fieldLabel: "Meeting place", practiceWord: "Meetup" },
  { key: "golf", label: "Golf", primaryColor: "#047857", secondaryColor: "#bef264", mascotHint: "Birdies", fieldLabel: "Course", practiceWord: "Range session" },
  { key: "tennis", label: "Tennis", primaryColor: "#65a30d", secondaryColor: "#fde047", mascotHint: "Aces", fieldLabel: "Court", practiceWord: "Clinic" },
  { key: "swim", label: "Swim", primaryColor: "#0284c7", secondaryColor: "#67e8f9", mascotHint: "Splash", fieldLabel: "Pool", practiceWord: "Meet prep" },
  { key: "generic", label: "Generic", primaryColor: "#1570ef", secondaryColor: "#d9e0ea", mascotHint: "Team", fieldLabel: "Location", practiceWord: "Practice" }
];

export function getProgramThemePreset(key: ProgramThemeKey) {
  return programThemePresets.find((preset) => preset.key === key) ?? programThemePresets[programThemePresets.length - 1]!;
}
