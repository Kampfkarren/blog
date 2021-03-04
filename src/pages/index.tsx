import { graphql, useStaticQuery } from "gatsby";
import React from "react";
import { ArticleListing } from "../components/article-listing";
import { Layout } from "../components/layout";

const Home: React.FC = () => {
  const pagesResult: {
    allMarkdownRemark: {
      edges: {
        node: {
          fields: {
            slug: string;
          };

          frontmatter: {
            date: string;
            title: string;
          };
        };
      }[];
    };
  } = useStaticQuery(
    graphql`
      query {
        allMarkdownRemark(sort: { fields: frontmatter___date, order: DESC }) {
          edges {
            node {
              fields {
                slug
              }
              frontmatter {
                date
                title
              }
            }
          }
        }
      }
    `
  );

  const pages = pagesResult.allMarkdownRemark.edges;

  return (
    <Layout
      location={{
        pathname: "/",
      }}
      title="home"
    >
      {pages.map(({ node: page }) => {
        return (
          <ArticleListing
            slug={page.fields.slug}
            date={page.frontmatter.date}
            title={page.frontmatter.title}
          />
        );
      })}
    </Layout>
  );
};

export default Home;
