import React from "react";
import { Helmet } from "react-helmet";
import styled, { createGlobalStyle } from "styled-components";
import { Header } from "./header";
import "@fontsource/m-plus-1p";
import { useStaticQuery } from "gatsby";
import { graphql } from "gatsby";

const Main = styled.div`
  font-family: "M PLUS 1p";
`;

const GlobalStyle = createGlobalStyle`
  body {
    background: repeating-linear-gradient(13deg,
      hsl(31, 96%, 85%) 0 50px,
      hsl(31, 96%, 90%) 50px 100px);
    background-size: 100px 100px;
  }
`;

const Content = styled.div`
  background-color: #eee;
  background-image: radial-gradient(#ddd 3%, transparent 20%),
    radial-gradient(#bbb 3%, transparent 20%);
  background-position: 0 0, 50px 50px;
  background-size: 10px 10px;
  margin: auto;
  margin-top: 1em;
  padding: 1% 3%;

  max-width: 850px;
  width: calc(100% - 160px);
`;

const useSiteMetadata = () => {
  const { site } = useStaticQuery(
    graphql`
      query {
        site {
          siteMetadata {
            url
          }
        }
      }
    `
  );
  return site.siteMetadata;
};

export const Layout: React.FC<{
  location: {
    pathname: string;
  };
  title: string;
  meta?: Partial<{
    author: string;
    description: string;
    published_time: string;
  }>;
}> = ({ title, children, meta, location }) => {
  const { url } = useSiteMetadata();

  return (
    <Main>
      <GlobalStyle />

      <Helmet>
        <title>{title} - boyned's blog</title>

        <meta charSet="utf-8" />
        <meta httpEquiv="x-ua-compatible" content="ie=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        <meta property="og:title" content={`${title} - boyned's blog`} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={url + location.pathname} />
        <meta property="og:image" content={`${url}/emblem.png`} />

        {meta?.description && (
          <meta property="og:description" content={meta.description} />
        )}

        {meta?.published_time && (
          <meta
            property="og:article:published_time"
            content={meta.published_time}
          />
        )}

        <meta property="og:article:author" content={meta?.author || "boyned"} />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${title} - boyned's blog`} />
      </Helmet>

      <Header />

      <Content>{children}</Content>
    </Main>
  );
};
