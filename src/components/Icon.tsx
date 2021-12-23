import * as PropTypes from "prop-types";
import styled from "styled-components";

interface IIconStyleProps {
  size: number;
}

const SIcon = styled.img<IIconStyleProps>`
  width: ${({ size }) => `${size}px`};
  height: ${({ size }) => `${size}px`};
`;

const Icon = (props: any) => {
  const { src, fallback, size } = props;
  return (
    <SIcon
      {...props}
      src={src}
      size={size}
      onError={(event: any) => {
        if (fallback) {
          event.target.src = fallback;
        }
      }}
    />
  );
};

Icon.propTypes = {
  src: PropTypes.string,
  fallback: PropTypes.string,
  size: PropTypes.number,
};

Icon.defaultProps = {
  src: null,
  fallback: "",
  size: 20,
};

export default Icon;
