import React, { useEffect, useRef } from "react";

export const Utterances: React.FC = () => {
  const ref = useRef<HTMLDivElement>();

  useEffect(() => {
    const script = document.createElement("script");

    script.setAttribute("src", "https://utteranc.es/client.js");
    script.setAttribute("repo", "Kampfkarren/blog");
    script.setAttribute("issue-term", "pathname");
    script.setAttribute("label", "comments section");
    script.setAttribute("theme", "github-light");
    script.setAttribute("crossorigin", "anonymous");
    script.async = true;

    ref.current.appendChild(script);
  }, []);

  return (
    <div ref={ref}>
      <noscript>You need JavaScript to be able to comment.</noscript>
    </div>
  );
};
