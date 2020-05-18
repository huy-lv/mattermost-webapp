import React from "react";
import TextStepContainer from "./TextStepContainer";
import ImageContainer from "./ImageContainer";
import Image from "./Image";
import Bubble from "./Bubble";

export default function Step({ key, user, message }) {
  return (
    <TextStepContainer className={`rsc-ts "rsc-ts-user"`} key={key}>
      <ImageContainer className="rsc-ts-image-container">
        <Image
          className="rsc-ts-image"
          src={
            "https://photo2.tinhte.vn/data/avatars/m/642/642197.jpg?1394077624"
          }
          alt="avatar"
        />
      </ImageContainer>
      <Bubble className="rsc-ts-bubble" isFirst={true}>
        {message}
      </Bubble>
    </TextStepContainer>
  );
}
