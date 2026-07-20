import React from "react";
import * as icons from "lucide-react";
import type { LucideProps } from "lucide-react";

function toPascalCase(kebab: string): string {
  return kebab
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export const Icon: React.FC<{ name: string } & LucideProps> = ({ name, ...props }) => {
  const componentName = toPascalCase(name) as keyof typeof icons;
  const LucideIcon = (icons[componentName] as React.FC<LucideProps>) ?? icons.HelpCircle;
  return <LucideIcon {...props} />;
};
