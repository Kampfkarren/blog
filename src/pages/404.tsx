import { Link } from "gatsby";
import React from "react";
import styled from "styled-components";
import { Layout } from "../components/layout";

const StyledText = styled.div`
  font-size: 1.4em;
`;

export default function () {
  return (
    <Layout location={{ pathname: "/404" }} title="404">
      <h1>404 - Page Not Found</h1>
      <StyledText>
        Try the <Link to="/">home page</Link>. That exists, I'd hope.
      </StyledText>
    </Layout>
  );
}
