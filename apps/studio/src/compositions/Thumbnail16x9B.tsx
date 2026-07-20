import React from "react";
import { Img, staticFile } from "remotion";
import { Icon } from "../components/Icon";
import { getTheme } from "../theme";
import { parseVideoInput, type VideoInput } from "../schema";

/**
 * A/B thumbnail testing (PROJECT_PLAN.md Phase 5): a second, visually
 * distinct branded thumbnail template driven by the exact same VideoInput
 * data as Thumbnail16x9 — bold diagonal color-blocked halves instead of dark
 * panels, since that's a proven high-CTR alternative style worth testing
 * against the original.
 */

const HalfPanel: React.FC<{
  contender: VideoInput["contenders"][number];
  isWinner: boolean;
  side: "left" | "right";
}> = ({ contender, isWinner, side }) => (
  <div
    style={{
      position: "absolute",
      top: 0,
      bottom: 0,
      [side]: 0,
      width: "58%",
      display: "flex",
      flexDirection: "column",
      alignItems: side === "left" ? "flex-start" : "flex-end",
      justifyContent: "flex-end",
      padding: "48px 64px",
      boxSizing: "border-box",
    }}
  >
    <Img
      src={staticFile(contender.imageUrl)}
      style={{
        position: "absolute",
        bottom: 40,
        [side]: side === "left" ? -40 : -40,
        width: 480,
        height: 480,
        objectFit: "contain",
        filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.5))",
      }}
    />
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "rgba(0,0,0,0.55)",
        borderRadius: 999,
        padding: "10px 24px",
        fontSize: 32,
        fontWeight: 800,
        color: "#fff",
      }}
    >
      {isWinner && <Icon name="crown" size={30} color="#ffd700" />}
      {contender.name}
    </div>
  </div>
);

export const Thumbnail16x9B: React.FC<VideoInput> = (props) => {
  const input = parseVideoInput(props);
  const theme = getTheme(input.meta.theme);
  const [left, right] = input.contenders;
  const winnerIndex = input.verdict.winnerIndex;

  return (
    <div style={{ position: "absolute", inset: 0, background: theme.backgroundFrom, overflow: "hidden" }}>
      {/* Diagonal split into two accent-colored halves. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: "polygon(0 0, 48% 0, 62% 100%, 0 100%)",
          background: `linear-gradient(160deg, ${left.accentColor}, ${theme.backgroundFrom})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: "polygon(52% 0, 100% 0, 100% 100%, 38% 100%)",
          background: `linear-gradient(200deg, ${right.accentColor}, ${theme.backgroundFrom})`,
        }}
      />

      <HalfPanel contender={left} isWinner={winnerIndex === 0} side="left" />
      <HalfPanel contender={right} isWinner={winnerIndex === 1} side="right" />

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontFamily: theme.fontDisplay,
          fontSize: 110,
          color: "#fff",
          textShadow: "0 0 30px rgba(0,0,0,0.8), 0 0 60px rgba(0,0,0,0.6)",
          WebkitTextStroke: `3px ${theme.neutralAccent}`,
        }}
      >
        VS
      </div>

      <div
        style={{
          position: "absolute",
          top: 40,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: theme.fontDisplay,
          fontSize: 56,
          color: "#fff",
          textShadow: "0 4px 20px rgba(0,0,0,0.8)",
          padding: "0 80px",
        }}
      >
        {input.meta.title}
      </div>
    </div>
  );
};
