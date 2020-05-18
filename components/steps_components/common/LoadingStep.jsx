import styled from "styled-components";
import { loading } from "../../animation/animations";

const LoadingStep = styled.span`
  animation: ${loading} 1.4s infinite both;
  animation-delay: ${props => props.delay};
`;

export default LoadingStep;
