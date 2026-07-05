"use client";

import { useEffect, useState } from "react";

export default function PageReveal() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => {
      document.body.style.overflow = "";
      setDone(true);
    }, 1600);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, []);

  if (done) return null;

  return (
    <div className="page-reveal" aria-hidden="true">
      <div className="page-reveal-left" />
      <div className="page-reveal-right" />
    </div>
  );
}
