import * as React from "react";
import { AnimatedTestimonials } from "@v7m/ui";
import { testimonialsPromotor } from "../data/testimonials";

export { testimonialsPromotor };

export default function AnimatedTestimonialsDemo() {
  return <AnimatedTestimonials testimonials={testimonialsPromotor} autoplay={true} />;
}
