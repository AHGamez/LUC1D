import type { AppProps } from "../../apps/types";
import { SettingsApp as SettingsPanel } from "./SettingsPanel";

/** Settings window: wires the shared settings panel to the shell's prefs and the signed-in account. */
export default function SettingsApp({ shell, session }: AppProps) {
  return (
    <SettingsPanel
      prefs={shell.prefs}
      onChange={shell.updatePrefs}
      onReset={shell.resetPrefs}
      account={{ name: session.user?.displayName ?? "", email: session.user?.email ?? null }}
      onSignOut={() => void shell.signOut()}
    />
  );
}
