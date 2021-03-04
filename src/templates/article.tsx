import React from "react";
import { graphql, Link } from "gatsby";
import { Layout } from "../components/layout";
import { Utterances } from "../components/utterances";

export const query = graphql`
  query($slug: String!) {
    markdownRemark(fields: { slug: { eq: $slug } }) {
      excerpt
      html
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
