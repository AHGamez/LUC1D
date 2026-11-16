/**
 * Tab cloaks change this browser tab's title and icon to look like another site.
 *
 * Opt-in only: the cloak is off by default and only changes when the user picks one in Settings.
 * Nothing here is applied automatically, and the choice is stored in this browser only.
 * The shell should call initTabCloak() once at startup to restore a previous choice.
 */

export interface TabCloak {
  id: string;
  name: string;
  title: string;
  icon: string;
}

export const TAB_CLOAKS: readonly TabCloak[] = [
  { id: "classroom", name: "Google Classroom", title: "Home", icon: "https://ssl.gstatic.com/classroom/favicon.png" },
  { id: "ixl", name: "IXL", title: "IXL | Dashboard", icon: "https://www.ixl.com/favicon.ico" },
  { id: "zearn", name: "Zearn", title: "Zearn", icon: "https://www.zearn.org/favicon.ico" },
  { id: "powerschool", name: "PowerSchool", title: "Grades and Attendance", icon: "https://www.powerschool.com/favicon.ico" },
];

const STORAGE_KEY = "luc1d-tab-cloak";
const LINK_ID = "luc1d-cloak";

/** The cloak id the user picked, or "" when off (the default). */
export function getTabCloakId(): string {
  try {
    const id = localStorage.getItem(STORAGE_KEY) ?? "";
    return TAB_CLOAKS.some((c) => c.id === id) ? id : "";
  } catch {
    return "";
  }
}

let realTitle: string | null = null;

/** Changes the tab to a cloak, or restores the real title and icon when id is "" or unknown. */
export function applyTabCloak(id: string): void {
  if (typeof document === "undefined") return;
  const cloak = TAB_CLOAKS.find((c) => c.id === id);
  const link = document.querySelector<HTMLLinkElement>(`link#${LINK_ID}`);

  if (!cloak) {
    link?.remove();
    if (realTitle !== null) {
      document.title = realTitle;
      realTitle = null;
    }
    return;
  }

  if (realTitle === null) realTitle = document.title;
  document.title = cloak.title;
  const icon = link ?? document.createElement("link");
  if (!link) {
    icon.id = LINK_ID;
    icon.rel = "icon";
    document.head.appendChild(icon);
  }
  icon.href = cloak.icon;
}

/** Saves the user's choice and applies it to this tab. */
export function setTabCloak(id: string): void {
  const valid = TAB_CLOAKS.some((c) => c.id === id) ? id : "";
  try {
    if (valid) localStorage.setItem(STORAGE_KEY, valid);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage disabled: the cloak still applies for this page load */
  }
  applyTabCloak(valid);
}

/** Restores the user's saved cloak at startup. Does nothing when the cloak is off. */
export function initTabCloak(): void {
  const id = getTabCloakId();
  if (id) applyTabCloak(id);
}
