import React from "react";
import { graphql, Link } from "gatsby";
import { Layout } from "../components/layout";
import styled from "styled-components";
import { Utterances } from "../components/utterances";

export const query = graphql`
  query($slug: String!) {
    markdownRemark(fields: { slug: { eq: $slug } }) {
      html
      frontmatter {
        date
        title
      }
    }
  }
`;

const StyledArticle = styled.div`
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

const Article: React.FC<{
  data: {
    markdownRemark: {
      frontmatter: {
        date: string;
        title: string;
      };
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
        published_time: data.markdownRemark.frontmatter.date,
      }}
    >
      <StyledArticle>
        <div
          dangerouslySetInnerHTML={{
            __html: markdown.html,
          }}
        />

        <hr />

        <Link to="/">Back to blog</Link>

        <Utterances />
      </StyledArticle>
    </Layout>
  );
};

export default Article;
