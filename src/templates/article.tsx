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

const BlogContent = styled.div`
  .custom-block.info {
    background: hsla(217, 90%, 60%, 50%);
    border: 5px solid hsla(217, 90%, 60%, 50%);
    border-radius: 10px;
    padding: 0.5% 1.5%;

    .custom-block-heading {
      font-weight: bold;
      font-size: 1.5em;
      text-align: center;
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

      <BlogContent>
        <span
          dangerouslySetInnerHTML={{
            __html: markdown.html,
          }}
        />
      </BlogContent>

      <hr />

      <Link to="/">Back to blog</Link>

      <Utterances />
    </Layout>
  );
};

export default Article;
