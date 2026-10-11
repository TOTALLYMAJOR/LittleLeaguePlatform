"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Ambient drifting cloud layer for the landing hero.
 *
 * Mirrors the signed-in navigation panel's backdrop treatment (globals.css
 * `.sidebar-video-backdrop`): a very low-opacity, desaturated texture sitting
 * under a soft `--bg`-tinted scrim, so it reads as atmosphere rather than
 * illustration. Framer Motion drives the drift so the timing is declarative and
 * respects reduced-motion without a separate CSS override.
 */

const CLOUDS = [
  { top: "6%", scale: 1, duration: 96, delay: 0, opacity: 0.9 },
  { top: "17%", scale: 0.72, duration: 132, delay: -38, opacity: 0.66 },
  { top: "30%", scale: 0.5, duration: 158, delay: -74, opacity: 0.48 }
];

function CloudShape({ opacity, filterId = "landing-cloud-blur" }: { opacity: number; filterId?: string }) {
  return (
    <svg viewBox="0 0 420 130" width="420" height="130" aria-hidden="true" focusable="false" style={{ opacity }}>
      <g fill="currentColor" filter={`url(#${filterId})`}>
        <ellipse cx="120" cy="82" rx="104" ry="34" />
        <ellipse cx="196" cy="58" rx="76" ry="34" />
        <ellipse cx="268" cy="80" rx="82" ry="30" />
        <ellipse cx="322" cy="62" rx="52" ry="24" />
      </g>
    </svg>
  );
}

export function LandingSky() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="landing-gateway-sky" aria-hidden="true">
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
        <defs>
          <filter id="landing-cloud-blur" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>
      </svg>

      {CLOUDS.map((cloud, index) => (
        <motion.div
          key={index}
          className="landing-gateway-cloud"
          style={{ top: cloud.top, scale: cloud.scale }}
          initial={{ x: "-30vw" }}
          animate={reduceMotion ? { x: "22vw" } : { x: "112vw" }}
          transition={reduceMotion ? { duration: 0 } : {
            duration: cloud.duration,
            delay: cloud.delay,
            repeat: Infinity,
            repeatType: "loop",
            ease: "linear"
          }}
        >
          <CloudShape opacity={cloud.opacity} />
        </motion.div>
      ))}
    </div>
  );
}

const FOOTER_CLOUDS = [
  { bottom: "-18px", scale: 0.78, duration: 58, delay: -8, opacity: 0.82 },
  { bottom: "42px", scale: 0.48, duration: 82, delay: -46, opacity: 0.54 }
];

export function LandingFooterClouds() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="landing-footer-clouds" aria-hidden="true">
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
        <defs>
          <filter id="landing-footer-cloud-blur" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
      </svg>
      {FOOTER_CLOUDS.map((cloud, index) => (
        <motion.div
          key={index}
          className="landing-footer-cloud"
          style={{ bottom: cloud.bottom, scale: cloud.scale }}
          initial={{ x: "-34vw" }}
          animate={reduceMotion ? { x: "-34vw" } : { x: "112vw" }}
          transition={reduceMotion ? { duration: 0 } : {
            duration: cloud.duration,
            delay: cloud.delay,
            repeat: Infinity,
            repeatType: "loop",
            ease: "linear"
          }}
        >
          <CloudShape opacity={cloud.opacity} filterId="landing-footer-cloud-blur" />
        </motion.div>
      ))}
    </div>
  );
}
