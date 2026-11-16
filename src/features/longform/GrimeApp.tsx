import type { AppProps } from "../../apps/types";
import { LongformApp } from "./LongformApp";

/** Grime Video: movies and TV shows, posted by the owner only. */
export default function GrimeApp(props: AppProps) {
  return <LongformApp {...props} app="grime" />;
}
