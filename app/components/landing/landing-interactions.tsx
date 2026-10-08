"use client";

import { useEffect, useState } from "react";

export function LandingInteractions() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    // Respect reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 1. Navbar scroll listener
    const header = document.querySelector(".site-header");
    const handleScroll = () => {
      if (header) {
        if (window.scrollY > 20) {
          header.classList.add("is-scrolled");
        } else {
          header.classList.remove("is-scrolled");
        }
      }

      // 2. Subtle Parallax for hero floating items (only if not reduced motion and screen > 768px)
      if (!prefersReducedMotion && window.innerWidth > 768) {
        const scrolled = window.scrollY;
        const p1 = document.querySelector<HTMLElement>(".hero-float-card");
        const p2 = document.querySelector<HTMLElement>(".hero-float-badge-1");
        const p3 = document.querySelector<HTMLElement>(".hero-float-badge-2");
        const p4 = document.querySelector<HTMLElement>(".hero-float-badge-3");

        if (p1 && scrolled < 800) {
          p1.style.transform = `translateY(${scrolled * -0.06}px)`;
        }
        if (p2 && scrolled < 800) {
          p2.style.transform = `translateY(${scrolled * -0.1}px)`;
        }
        if (p3 && scrolled < 800) {
          p3.style.transform = `translateY(${scrolled * -0.04}px)`;
        }
        if (p4 && scrolled < 800) {
          p4.style.transform = `translateY(${scrolled * -0.08}px)`;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    // 3. Scroll Reveal via IntersectionObserver
    if (!prefersReducedMotion) {
      const revealElements = document.querySelectorAll(".reveal-init");
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-revealed");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
      );

      revealElements.forEach((el) => observer.observe(el));

      // 4. How It Works Step tracking observer
      const stepItems = document.querySelectorAll(".journey-step-item");
      const stepObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const idx = entry.target.getAttribute("data-step-index");
              if (idx !== null) {
                setActiveStep(parseInt(idx, 10));
              }
            }
          });
        },
        { threshold: 0.5 },
      );

      stepItems.forEach((item) => stepObserver.observe(item));

      return () => {
        window.removeEventListener("scroll", handleScroll);
        observer.disconnect();
        stepObserver.disconnect();
      };
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return null;
}
