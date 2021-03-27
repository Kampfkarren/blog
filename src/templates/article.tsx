import React from "react";
import styled from "styled-components";
import { graphql, Link } from "gatsby";
import { Layout } from "../components/layout";
import { Utterances } from "../components/utterances";

export const query = graphql`
  query($slug: String!) {
    markdownRemark(fields: { slug: { eq: $slug } }) {
      excerpt
      html
      timeToRead
      frontmatter {
        date
        title
      }
    }
  }
`;

const Article: React.FC<{
  data: {
    markdownRemark: {
      frontmatter: {
        date: string;
        title: string;
      };
      timeToRead: number;
      excerpt: string;
      html: string;
    };
  };

  location: Location;
}> = ({ data, location }) => {
  const markdown = data.markdownRemark;

  return (
    <Layout
      location={location}
      title={markdown.frontmatter.title}
      meta={{
        description: data.markdownRemark.excerpt,
        published_time: data.markdownRemark.frontmatter.date,
      }}
    >
      <header
        style={{
          borderBottom: "2px solid rgba(50, 50, 50, 0.3)",
        }}
      >
        <h1
          style={{
            marginBottom: "-10px",
          }}
        >
          {markdown.frontmatter.title}
        </h1>
        <p>{markdown.timeToRead} minute read</p>
      </header>

      <div
        dangerouslySetInnerHTML={{
          __html: markdown.html,
        }}
      />

      <hr />

      <Link to="/">Back to blog</Link>

      <Utterances />
    </Layout>
  );
};

export default Article;
