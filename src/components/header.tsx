import { Link } from "gatsby";
import React from "react";
import styled, { keyframes } from "styled-components";

const StyledHeader = styled.div`
  text-align: center;
`;

// Taken from Google Fonts
const fireAnimation = keyframes`
  0% {
    text-shadow: 0 -0.05em 0.2em #FFF,
      0.01em -0.02em 0.15em #FE0,
      0.01em -0.05em 0.15em #FC0,
      0.02em -0.15em 0.2em #F90,
      0.04em -0.20em 0.3em #F70,
      0.05em -0.25em 0.4em #F70,
      0.06em -0.2em 0.9em #F50,
      0.1em -0.1em 1.0em #F40;
  }
  25% {
    text-shadow: 0 -0.05em 0.2em #FFF,
      0 -0.05em 0.17em #FE0,
      0.04em -0.12em 0.22em #FC0,
      0.04em -0.13em 0.27em #F90,
      0.05em -0.23em 0.33em #F70,
      0.07em -0.28em 0.47em #F70,
      0.1em -0.3em 0.8em #F50,
      0.1em -0.3em 0.9em #F40;
  }
  50% {
    text-shadow: 0 -0.05em 0.2em #FFF,
      0.01em -0.02em 0.15em #FE0,
      0.01em -0.05em 0.15em #FC0,
      0.02em -0.15em 0.2em #F90,
      0.04em -0.20em 0.3em #F70,
      0.05em -0.25em 0.4em #F70,
      0.06em -0.2em 0.9em #F50,
      0.1em -0.1em 1.0em #F40;
  }
  75% {
    text-shadow: 0 -0.05em 0.2em #FFF,
      0 -0.06em 0.18em #FE0,
      0.05em -0.15em 0.23em #FC0,
      0.05em -0.15em 0.3em #F90,
      0.07em -0.25em 0.4em #F70,
      0.09em -0.3em 0.5em #F70,
      0.1em -0.3em 0.9em #F50,
      0.1em -0.3em 1.0em #F40;
  }
  100% {
    text-shadow: 0 -0.05em 0.2em #FFF,
      0.01em -0.02em 0.15em #FE0,
      0.01em -0.05em 0.15em #FC0,
      0.02em -0.15em 0.2em #F90,
      0.04em -0.20em 0.3em #F70,
      0.05em -0.25em 0.4em #F70,
      0.06em -0.2em 0.9em #F50,
      0.1em -0.1em 1.0em #F40;
  }
`;

const TitleLink = styled(Link)`
  color: white;
  display: block;
  font-weight: bolder;
  font-size: 2em;
  text-decoration: none;

  animation: ${fireAnimation} 0.8s alternate infinite;
`;

const Links: React.FC<{
  links: {
    link: string;
    text: string;
  }[];
}> = (props) => {
  const StyledLinks = styled.div`
    color: white;
    filter: drop-shadow(3px 3px 3px black);
  `;

  const StyledLink = styled(Link)`
    color: white;
    text-decoration: none;
  `;

  return (
    <StyledLinks>
      {props.links.map((link, index) => {
        return (
          <span key={link.link}>
            <StyledLink to={link.link}>{link.text}</StyledLink>{" "}
            {index !== props.links.length - 1 && " | "}
          </span>
        );
      })}
    </StyledLinks>
  );
};

export const Header: React.FC = () => {
  return (
    <StyledHeader>
      <TitleLink to="/">boyned's blog</TitleLink>
      <Links
        links={[
          {
            link: "https://twitter.com/Kampfkarren",
            text: "Twitter",
          },

          {
            link: "https://github.com/Kampfkarren",
            text: "GitHub",
          },

          {
            link: "https://ko-fi.com/boyned",
            text: "Ko-fi",
          },
        ]}
      />
    </StyledHeader>
  );
};
