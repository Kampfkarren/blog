import React from "react";
import { Link } from "gatsby";
import styled from "styled-components";

const StyledArticleListing = styled.article``;

const ArticleTitle = styled(Link)`
  font-size: 1.3em;
`;

export const ArticleListing: React.FC<{
  slug: string;
  date: string;
  title: string;
}> = ({ slug, date, title }) => {
  return (
    <StyledArticleListing key={slug}>
      <ArticleTitle to={`/articles${slug}`}>
        {title} - {date}
      </ArticleTitle>
    </StyledArticleListing>
  );
};
