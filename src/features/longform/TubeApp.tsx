import type { AppProps } from "../../apps/types";
import { LongformApp } from "./LongformApp";

/** Tube For You: long-form videos from any signed-in user. */
export default function TubeApp(props: AppProps) {
  return <LongformApp {...props} app="tube" />;
}
