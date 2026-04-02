import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["300", "400", "600", "700"], subsets: ["latin"] });

export const SceneIntro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 15, stiffness: 120 } });
  const titleY = interpolate(
    spring({ frame: frame - 20, fps, config: { damping: 20, stiffness: 100 } }),
    [0, 1], [60, 0]
  );
  const titleOp = interpolate(frame, [20, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subtitleOp = interpolate(frame, [40, 65], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subtitleY = interpolate(frame, [40, 65], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineW = interpolate(frame, [55, 90], [0, 200], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pulse = Math.sin(frame * 0.06) * 0.03 + 1;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily }}>
      <div style={{
        width: 140, height: 140, borderRadius: "50%",
        background: "linear-gradient(135deg, #0078FF 0%, #00C9A7 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: `scale(${logoScale * pulse})`,
        boxShadow: "0 0 80px rgba(0, 120, 255, 0.4)",
        marginBottom: 40,
      }}>
        <span style={{ fontSize: 56, fontWeight: 700, color: "#fff", letterSpacing: -2 }}>OM</span>
      </div>
      <div style={{
        fontSize: 68, fontWeight: 700, color: "#FFFFFF",
        transform: `translateY(${titleY}px)`, opacity: titleOp,
        letterSpacing: -2, lineHeight: 1.1, textAlign: "center",
      }}>
        OceanMan Project Manager
      </div>
      <div style={{
        width: lineW, height: 3, borderRadius: 2,
        background: "linear-gradient(90deg, #0078FF, #00C9A7)",
        marginTop: 20, marginBottom: 20,
      }} />
      <div style={{
        fontSize: 28, fontWeight: 300, color: "rgba(255,255,255,0.7)",
        opacity: subtitleOp, transform: `translateY(${subtitleY}px)`,
        textAlign: "center", maxWidth: 700, lineHeight: 1.5,
      }}>
        End-to-end management for open water sporting events
      </div>
    </AbsoluteFill>
  );
};
