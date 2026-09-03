import * as React from "react";
import { AnimatedTestimonials } from "./ui/animated-testimonials";
import { testimonialsSupletivo } from "../data/testimonials";

export { testimonialsSupletivo };

export default function AnimatedTestimonialsDemo() {
  return <AnimatedTestimonials testimonials={testimonialsSupletivo} autoplay={true} />;
}
