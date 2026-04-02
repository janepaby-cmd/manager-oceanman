import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { SceneIntro } from "./scenes/SceneIntroEN";
import { SceneDashboardEN } from "./scenes/SceneDashboardEN";
import { SceneProjectsEN } from "./scenes/SceneProjectsEN";
import { SceneFeaturesEN } from "./scenes/SceneFeaturesEN";
import { SceneClosingEN } from "./scenes/SceneClosingEN";

const BG_GRADIENT = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const hueShift = interpolate(frame, [0, durationInFrames], [0, 30]);
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, 
          hsl(${210 + hueShift}, 80%, 8%) 0%, 
          hsl(${220 + hueShift}, 60%, 14%) 50%, 
          hsl(${200 + hueShift}, 70%, 10%) 100%)`,
      }}
    />
  );
};

const FloatingOrbs = () => {
  const frame = useCurrentFrame();
  const orbs = [
    { x: 15, y: 20, size: 300, color: "0, 120, 255", delay: 0 },
    { x: 75, y: 70, size: 400, color: "0, 200, 180", delay: 50 },
    { x: 50, y: 40, size: 250, color: "100, 150, 255", delay: 100 },
  ];
  return (
    <AbsoluteFill style={{ opacity: 0.15 }}>
      {orbs.map((orb, i) => {
        const drift = Math.sin((frame + orb.delay) * 0.015) * 30;
        const driftY = Math.cos((frame + orb.delay) * 0.012) * 20;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${orb.x}%`,
              top: `${orb.y}%`,
              width: orb.size,
              height: orb.size,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(${orb.color}, 0.6) 0%, transparent 70%)`,
              transform: `translate(${drift}px, ${driftY}px)`,
              filter: "blur(60px)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const MainVideoEN = () => {
  return (
    <AbsoluteFill>
      <BG_GRADIENT />
      <FloatingOrbs />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={180}>
          <SceneIntro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={160}>
          <SceneDashboardEN />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={160}>
          <SceneProjectsEN />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={180}>
          <SceneFeaturesEN />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 25 })}
        />
        <TransitionSeries.Sequence durationInFrames={150}>
          <SceneClosingEN />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
