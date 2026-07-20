import React from "react";
import { Img, staticFile } from "remotion";
import { Background } from "../components/Background";
import { PricePill } from "../components/PricePill";
import { Icon } from "../components/Icon";
import { getTheme } from "../theme";
import { parseVideoInput, type VideoInput } from "../schema";

/**
 * The branded thumbnail template (PROJECT_PLAN.md §2: "one branded
 * thumbnail template, generated from same data" via `renderStill()`).
 * A still composition — no time-based animation, since renderStill()
 * evaluates a single frame.
 */

const ContenderPanel: React.FC<{ contender: VideoInput["contenders"][number]; isWinner: boolean }> = ({
  contender,
  isWinner,
}) => (
  <div
    style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 16,
    }}
  >
    {/* Fixed-height slot (rendered empty for the non-winner) so both panels
        stay aligned regardless of which contender wins. */}
    <div style={{ height: 64, display: "flex", alignItems: "center" }}>
      {isWinner && <Icon name="crown" size={64} color={contender.accentColor} strokeWidth={1.75} />}
    </div>
    <div
      style={{
        width: 320,
        height: 320,
        borderRadius: 28,
        background: contender.accentColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 0 70px ${contender.accentColor}77`,
        overflow: "hidden",
        border: isWinner ? `6px solid ${contender.accentColor}` : "none",
      }}
    >
      <Img src={staticFile(contender.imageUrl)} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
    <PricePill price={contender.price} color={contender.accentColor} theme={getTheme("default")} />
  </div>
);

export const Thumbnail16x9: React.FC<VideoInput> = (props) => {
  const input = parseVideoInput(props);
  const theme = getTheme(input.meta.theme);
  const [left, right] = input.contenders;
  const winnerIndex = input.verdict.winnerIndex;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Background theme={theme} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "56px 100px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            fontFamily: theme.fontDisplay,
            fontSize: 64,
            color: theme.textPrimary,
            textAlign: "center",
            letterSpacing: 1,
            textShadow: "0 4px 20px rgba(0,0,0,0.6)",
          }}
        >
          {input.meta.title}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 60 }}>
          <ContenderPanel contender={left} isWinner={winnerIndex === 0} />
          <div
            style={{
              fontFamily: theme.fontDisplay,
              fontSize: 88,
              color: theme.neutralAccent,
              textShadow: `0 0 40px ${theme.neutralAccent}`,
            }}
          >
            VS
          </div>
          <ContenderPanel contender={right} isWinner={winnerIndex === 1} />
        </div>

        <div
          style={{
            fontFamily: theme.fontDisplay,
            fontSize: 40,
            color: theme.textPrimary,
            background: `${theme.surface}dd`,
            padding: "16px 40px",
            borderRadius: 999,
            textAlign: "center",
          }}
        >
          WHO WINS?
        </div>
      </div>
    </div>
  );
};
