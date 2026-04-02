import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["300", "400", "600", "700"], subsets: ["latin"] });

export const SceneClosing = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoS = spring({ frame, fps, config: { damping: 14 } });
  const titleOp = interpolate(frame, [15, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [15, 40], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subOp = interpolate(frame, [35, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ctaS = spring({ frame: frame - 50, fps, config: { damping: 15 } });

  const pulse = Math.sin(frame * 0.08) * 0.02 + 1;

  return (
    <AbsoluteFill style={{ fontFamily, justifyContent: "center", alignItems: "center" }}>
      <div style={{
        width: 100, height: 100, borderRadius: "50%",
        background: "linear-gradient(135deg, #0078FF, #00C9A7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: `scale(${logoS * pulse})`,
        boxShadow: "0 0 100px rgba(0, 120, 255, 0.3)",
        marginBottom: 36,
      }}>
        <span style={{ fontSize: 40, fontWeight: 700, color: "#fff" }}>OM</span>
      </div>

      <div style={{
        fontSize: 56, fontWeight: 700, color: "#fff", opacity: titleOp,
        transform: `translateY(${titleY}px)`, textAlign: "center" as const,
        letterSpacing: -1, marginBottom: 16,
      }}>
        OceanMan Manager
      </div>

      <div style={{
        fontSize: 22, color: "rgba(255,255,255,0.6)", opacity: subOp,
        textAlign: "center" as const, fontWeight: 300, lineHeight: 1.5,
        maxWidth: 600, marginBottom: 40,
      }}>
        Control total · Visibilidad completa · Colaboración eficiente
      </div>

      <div style={{
        padding: "16px 48px", borderRadius: 50,
        background: "linear-gradient(135deg, #0078FF, #00C9A7)",
        fontSize: 18, fontWeight: 600, color: "#fff", letterSpacing: 0.5,
        opacity: interpolate(ctaS, [0, 1], [0, 1]),
        transform: `scale(${interpolate(ctaS, [0, 1], [0.8, 1])})`,
        boxShadow: "0 8px 30px rgba(0, 120, 255, 0.3)",
      }}>
        manager.oceanmanswim.com
      </div>
    </AbsoluteFill>
  );
};
