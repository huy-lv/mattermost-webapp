import React from "react";
import {
  TextStepContainer,
  ImageContainer,
  Image,
  Bubble
} from "../steps_components";
import { Typography } from "@material-ui/core";
export default function TranscriptionMessage({
  mine,
  message,
  final,
  last,
  src,
  next,
  vi,
  en,
  viTranslation,
  photoURL
}) {
  if (!final && !message) return null;
  let isFirst = true;
  let isLast = false;
  if (!last) {
    isFirst = true;
  } else {
    if (last.src === src) {
      isFirst = false;
    } else {
      isFirst = true;
    }
  }
  if (!next) {
    isLast = true;
  } else {
    if (next.src === src) {
      if (!next.final) {
        if (!next.trans) {
          isLast = true;
        } else {
          isLast = false;
        }
      } else {
        isLast = false;
      }
    } else {
      isLast = true;
    }
  }
  // console.log("message: ", message, final, isFirst, isLast);
  return (
    <TextStepContainer
      className={`rsc-ts ${mine ? "rsc-ts-user" : "rsc-ts-bot"}`}
      user={mine}
    >
      <ImageContainer className="rsc-ts-image-container" user={mine}>
        {isFirst && (
          <Image
            className="rsc-ts-image"
            style={{}}
            user={mine}
            src={photoURL || "../images/avatar.png"}
            alt=""
          />
        )}
      </ImageContainer>
      <Bubble
        className="rsc-ts-bubble"
        style={{}}
        showAvatar={true}
        user={mine}
        isFirst={isFirst}
        isLast={isLast}
      >
        <Typography>{message}</Typography>
        {viTranslation && vi ? (
          <Typography variant="caption">{vi}</Typography>
        ) : null}
        {en ? <Typography variant="caption">{en}</Typography> : null}
      </Bubble>
    </TextStepContainer>
  );
}
