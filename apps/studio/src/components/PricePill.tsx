import React from "react";
import type { Theme } from "../theme";
import { Icon } from "./Icon";

export const PricePill: React.FC<{ price: string; color: string; theme: Theme }> = ({
  price,
  color,
  theme,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "12px 28px",
      borderRadius: 999,
      background: theme.surface,
      border: `2px solid ${color}`,
      fontFamily: theme.fontBody,
      fontSize: 30,
      fontWeight: 700,
      color: theme.textPrimary,
    }}
  >
    <Icon name="dollar-sign" size={24} color={color} />
    {price}
  </div>
);
