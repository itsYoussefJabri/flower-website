import React, { useEffect, useRef, useCallback } from "react";
import gsap from "gsap";

function Home() {
  const containerRef = useRef(null);
  const svgContainerRef = useRef(null);
  const animatedRef = useRef(false);
  const svgTextRef = useRef(null);

  const loadAndAnimateSvg = useCallback(() => {
    if (animatedRef.current) return;

    const inject = (text) => {
      if (!svgContainerRef.current || animatedRef.current) return;
      svgContainerRef.current.innerHTML = text;
      const svgEl = svgContainerRef.current.querySelector("svg");
      if (svgEl) {
        svgEl.removeAttribute("width");
        svgEl.removeAttribute("height");
        svgEl.setAttribute("preserveAspectRatio", "xMidYMid slice");
      }
      animatedRef.current = true;
      runAnimation();
    };

    if (svgTextRef.current) {
      inject(svgTextRef.current);
    } else {
      fetch("/flowers-bg.svg")
        .then((res) => res.text())
        .then((text) => {
          svgTextRef.current = text;
          inject(text);
        })
        .catch((err) => console.log("SVG load error:", err));
    }
  }, []);

  useEffect(() => {
    const isMobilePortrait = window.matchMedia(
      "(orientation: portrait) and (max-width: 900px)",
    );

    // Desktop or already landscape → load immediately
    if (!isMobilePortrait.matches) {
      loadAndAnimateSvg();
    }

    // When orientation changes to landscape, load & animate the SVG
    const handleOrientation = (e) => {
      if (!e.matches) {
        loadAndAnimateSvg();
      }
    };
    isMobilePortrait.addEventListener("change", handleOrientation);

    return () => {
      isMobilePortrait.removeEventListener("change", handleOrientation);
      gsap.killTweensOf("*");
    };
  }, [loadAndAnimateSvg]);

  function runAnimation() {
    const container = svgContainerRef.current;
    if (!container) return;

    const branches = Array.from(
      container.querySelectorAll("[id^=BranchGroup]"),
    );
    const branchesLeft = Array.from(
      container.querySelectorAll("[id^=BranchGroup-left]"),
    );
    const branchesRight = Array.from(
      container.querySelectorAll("[id^=BranchGroup-right]"),
    );
    const branchesBottom = Array.from(
      container.querySelectorAll("[id^=BranchGroup-bottom]"),
    );

    // Shuffle
    const shuffled = [...branches].sort(() => 0.5 - Math.random());

    // Setup
    gsap.set(container.querySelectorAll("[id^=petal-]"), { fill: "#e5d081" });
    gsap.set(
      [
        ...container.querySelectorAll("[id^=flower-]"),
        ...container.querySelectorAll("[id^=bud-]"),
        ...container.querySelectorAll("[id^=bloom-]"),
      ],
      { scale: 0, transformOrigin: "center center" },
    );
    gsap.set(branchesLeft, { transformOrigin: "bottom left" });
    gsap.set(branchesRight, { transformOrigin: "bottom right" });
    gsap.set(branchesBottom, { transformOrigin: "bottom center" });

    const bl1 = container.querySelector("#BranchGroup-left-1");
    if (bl1) gsap.set(bl1, { transformOrigin: "0% 20%" });
    const br16 = container.querySelector("#BranchGroup-right-16");
    if (br16) gsap.set(br16, { transformOrigin: "100% 20%" });

    gsap.set(shuffled, { scale: 0 });

    // Make visible
    const svgContainer = containerRef.current?.querySelector(".svg-background");
    if (svgContainer) svgContainer.style.visibility = "visible";

    // Master timeline
    const master = gsap.timeline();

    // Grow branches
    master.to(shuffled, {
      scale: 1,
      ease: "power1.out",
      duration: 3,
      stagger: {
        each: 0.25,
        onStart: function () {
          bloomFlowers(this.targets()[0], container);
        },
        onComplete: function () {
          swayBranch(this.targets()[0], container);
        },
      },
    });

    // Small branches sway
    master.add(() => {
      const smallBranches = Array.from(
        container.querySelectorAll("[id^=smallbranch-group]"),
      );
      gsap.to(smallBranches, {
        rotation: 5,
        ease: "sine.inOut",
        duration: 2 + Math.random(),
        stagger: Math.random() / 1.2,
        yoyo: true,
        repeat: -1,
      });
    });
  }

  function bloomFlowers(branch, container) {
    const petals = branch.querySelectorAll("[id^=petal-]");
    const flowers = branch.querySelectorAll("[id^=flower-]");
    const buds = branch.querySelectorAll("[id^=bud-]");
    const blooms = branch.querySelectorAll("[id^=bloom-]");

    const tl = gsap.timeline({ delay: 1.5 });
    tl.to([...flowers, ...buds, ...blooms], {
      scale: 1,
      ease: "back.out(2)",
      duration: 2,
      stagger: 0.5,
    })
      .to(flowers, { rotation: 45, ease: "sine.out", duration: 3 }, 0)
      .to(petals, { fill: "#fff", duration: 1 }, 0);
  }

  function swayBranch(branch) {
    const position = branch.getAttribute("data-position");
    let rotation = position === "left" ? -10 : position === "right" ? 5 : 10;

    gsap.to(branch, {
      rotation: rotation,
      ease: "sine.inOut",
      duration: 2 + Math.random(),
      yoyo: true,
      repeat: -1,
    });
  }

  return (
    <div className="home-page" ref={containerRef}>
      <div
        className="svg-background"
        ref={svgContainerRef}
        style={{ visibility: "hidden" }}
      />
      <div className="home-welcome">
        <h1>
          Welcome
          <span>QAMAR</span>
        </h1>
      </div>
    </div>
  );
}

export default Home;
